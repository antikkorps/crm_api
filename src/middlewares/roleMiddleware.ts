import { Context, Next } from "koa"
import { Role, User } from "../models"

/**
 * Type pour les permissions relatives à une ressource
 */
interface ResourcePermission {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
  execute: boolean
}

/**
 * Type pour les permissions globales de l'utilisateur
 */
interface Permissions {
  [resource: string]: ResourcePermission
}

/**
 * Middleware pour vérifier les permissions en fonction du rôle de l'utilisateur
 *
 * @param resource La ressource à laquelle l'utilisateur souhaite accéder (ex: "users", "contacts")
 * @param action L'action que l'utilisateur souhaite effectuer (ex: "create", "read", "update", "delete")
 * @returns Middleware pour vérifier les permissions
 */
export const checkPermission = (resource: string, action: keyof ResourcePermission) => {
  return async (ctx: Context, next: Next) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!ctx.state.user) {
        ctx.status = 401
        ctx.body = { error: "Authentication required" }
        return
      }

      // Vérifier si l'utilisateur est super admin
      const user = await User.findByPk(ctx.state.user.id)
      if (user && user.get("isSuperAdmin") === true) {
        // Les super admins ont toutes les permissions
        await next()
        return
      }

      // Pour les utilisateurs normaux, continuer avec la vérification des rôles

      // Récupérer le rôle de l'utilisateur
      const userRoleId = ctx.state.user.roleId
      const role = await Role.findByPk(userRoleId)

      if (!role) {
        ctx.status = 403
        ctx.body = { error: "Role not found" }
        return
      }

      // Récupérer les permissions du rôle
      const permissions = role.get("permissions") as Permissions | null

      // Vérifier si les permissions existent
      if (!permissions) {
        ctx.status = 403
        ctx.body = { error: "This role has no permissions defined" }
        return
      }

      // Vérifier si la ressource existe dans les permissions
      if (!permissions[resource]) {
        ctx.status = 403
        ctx.body = {
          error: `You don't have access to ${resource}`,
          resource,
          action,
        }
        return
      }

      // Vérifier si l'action existe dans les permissions de cette ressource
      if (!(action in permissions[resource])) {
        ctx.status = 403
        ctx.body = {
          error: `The action "${action}" is not defined for resource "${resource}"`,
          resource,
          action,
        }
        return
      }

      // Vérifier si l'action est autorisée pour cette ressource
      if (!permissions[resource][action]) {
        ctx.status = 403
        ctx.body = {
          error: `You don't have permission to ${action} ${resource}`,
          resource,
          action,
        }
        return
      }

      // Si tout est OK, passer au middleware suivant
      await next()
    } catch (error) {
      console.error("Permission check error:", error);
      ctx.status = 500
      ctx.body = {
        error: "Error checking permissions",
        details: error instanceof Error ? error.message : String(error),
      }
    }
  }
}

/**
 * Middleware pour vérifier si l'utilisateur est un super admin
 */
export const isSuperAdmin = async (ctx: Context, next: Next) => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!ctx.state.user) {
      ctx.status = 401
      ctx.body = { error: "Authentication required" }
      return
    }

    // Récupérer l'utilisateur
    const user = await User.findByPk(ctx.state.user.id)

    if (!user) {
      ctx.status = 403
      ctx.body = { error: "User not found" }
      return
    }

    // Vérifier si c'est un super admin
    if (user.get("isSuperAdmin") !== true) {
      ctx.status = 403
      ctx.body = {
        error: "Super Administrator privileges required",
      }
      return
    }

    // Si l'utilisateur est super admin, passer au middleware suivant
    await next()
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      error: "Error checking super admin status",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Middleware pour vérifier si l'utilisateur est un administrateur
 */
export const isAdmin = async (ctx: Context, next: Next) => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!ctx.state.user) {
      ctx.status = 401
      ctx.body = { error: "Authentication required" }
      return
    }

    // Récupérer l'utilisateur
    const user = await User.findByPk(ctx.state.user.id)

    if (!user) {
      ctx.status = 403
      ctx.body = { error: "User not found" }
      return
    }

    // Les super admins passent automatiquement
    if (user.get("isSuperAdmin") === true) {
      await next()
      return
    }

    // Pour les autres, vérifier le rôle admin

    // Récupérer le rôle de l'utilisateur
    const userRoleId = ctx.state.user.roleId
    const role = await Role.findByPk(userRoleId)

    if (!role) {
      ctx.status = 403
      ctx.body = { error: "Role not found" }
      return
    }

    // Vérifier si c'est un administrateur
    const roleName = role.get("name")
    if (roleName !== "Admin") {
      ctx.status = 403
      ctx.body = {
        error: "Administrator privileges required",
        role: roleName,
      }
      return
    }

    // Si l'utilisateur est admin, passer au middleware suivant
    await next()
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      error: "Error checking admin status",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Middleware pour vérifier si l'utilisateur appartient au même tenant que la ressource
 * ou s'il est un admin
 */
export const checkSameTenant = async (ctx: Context, next: Next) => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!ctx.state.user) {
      ctx.status = 401
      ctx.body = { error: "Authentication required" }
      return
    }

    // Récupérer le tenant de l'utilisateur
    const userTenantId = ctx.state.user.tenantId

    // Récupérer le tenant de la ressource (depuis les paramètres de la requête ou le body)
    let resourceTenantId: string | null = null

    // Essayer de récupérer le tenantId depuis les paramètres de la route
    if (ctx.params.tenantId) {
      resourceTenantId = ctx.params.tenantId
    }

    // Sinon, essayer de récupérer depuis le body de la requête
    else if (ctx.request.body && (ctx.request.body as any).tenantId) {
      resourceTenantId = (ctx.request.body as any).tenantId
    }

    // Si on n'a pas trouvé de tenantId, passer au middleware suivant
    // (la vérification sera faite ailleurs ou n'est pas pertinente)
    if (!resourceTenantId) {
      await next()
      return
    }

    // Vérifier si l'utilisateur est super admin (ils peuvent accéder à tous les tenants)
    const user = await User.findByPk(ctx.state.user.id)
    if (user && user.get("isSuperAdmin") === true) {
      await next()
      return
    }

    // Pour les utilisateurs normaux, continuer avec la vérification du tenant

    // Vérifier si l'utilisateur appartient au même tenant que la ressource
    if (userTenantId !== resourceTenantId) {
      // Vérifier si l'utilisateur est admin
      const userRoleId = ctx.state.user.roleId
      const role = await Role.findByPk(userRoleId)

      if (!role || role.get("name") !== "Admin") {
        ctx.status = 403
        ctx.body = {
          error: "You can only access resources from your own tenant",
          userTenantId,
          resourceTenantId,
        }
        return
      }
    }

    // Si tout est OK, passer au middleware suivant
    await next()
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      error: "Error checking tenant access",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}
