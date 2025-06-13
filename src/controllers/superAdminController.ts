import { Context } from "koa"
import { Activity, Company, Contact, Reminder, Role, Tenant, User } from "../models"

/**
 * Récupérer la liste de tous les tenants
 */
export const getAllTenantsWithStats = async (ctx: Context) => {
  try {
    const tenants = await Tenant.findAll()

    // Enrichir avec des statistiques
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const tenantId = tenant.get("id")

        // Compter les utilisateurs par tenant
        const userCount = await User.count({ where: { tenantId } })

        // Compter les rôles par tenant
        const roleCount = await Role.count({ where: { tenantId } })

        // Compter les contacts par tenant
        const contactCount = await Contact.count({ where: { tenantId } })

        // compter les entreprises par tenant
        const companyCount = await Company.count({ where: { tenantId } })

        // compter les notes par tenant
        const noteCount = await Activity.count({ where: { tenantId, type: "NOTE" } })

        // compter les rappels par tenant
        const reminderCount = await Reminder.count({ where: { tenantId } })

        return {
          ...tenant.toJSON(),
          stats: {
            userCount,
            roleCount,
            contactCount,
            companyCount,
            noteCount,
            reminderCount,
          },
        }
      })
    )

    ctx.body = tenantsWithStats
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Créer un nouveau tenant avec ses données initiales
 */
export const createTenantWithInitialData = async (ctx: Context) => {
  try {
    const { name, domain, adminEmail, adminPassword } = ctx.request.body as any

    // Vérifier que toutes les données nécessaires sont présentes
    if (!name || !domain || !adminEmail || !adminPassword) {
      ctx.status = 400
      ctx.body = {
        error: "Missing required fields (name, domain, adminEmail, adminPassword)",
      }
      return
    }

    // Vérifier que le domaine n'est pas déjà utilisé
    const existingDomain = await Tenant.findOne({ where: { domain } })
    if (existingDomain) {
      ctx.status = 400
      ctx.body = { error: "Domain already in use" }
      return
    }

    // Créer le nouveau tenant
    const tenant = await Tenant.create({ name, domain })
    const tenantId = tenant.get("id") as string

    // Créer les rôles pour ce tenant
    const adminRole = await Role.create({
      name: "Admin",
      tenantId,
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        contacts: { create: true, read: true, update: true, delete: true },
        companies: { create: true, read: true, update: true, delete: true },
        statuses: { create: true, read: true, update: true, delete: true },
        roles: { create: true, read: true, update: true, delete: true },
        notes: { create: true, read: true, update: true, delete: true },
        reminders: { create: true, read: true, update: true, delete: true },
        tenant: { create: false, read: true, update: true, delete: false },
      },
    })

    const userRole = await Role.create({
      name: "User",
      tenantId,
      permissions: {
        users: { create: false, read: true, update: false, delete: false },
        contacts: { create: true, read: true, update: true, delete: false },
        companies: { create: true, read: true, update: true, delete: false },
        statuses: { create: false, read: true, update: false, delete: false },
        roles: { create: false, read: false, update: false, delete: false },
        notes: { create: true, read: true, update: true, delete: true },
        reminders: { create: true, read: true, update: true, delete: true },
        tenant: { create: false, read: true, update: false, delete: false },
      },
    })

    // Hasher le mot de passe
    const bcrypt = require("bcrypt")
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(adminPassword, salt)

    // Créer l'utilisateur admin pour ce tenant
    const admin = await User.create({
      email: adminEmail,
      password: hashedPassword,
      firstName: "Admin",
      lastName: name,
      roleId: adminRole.get("id") as string,
      tenantId,
      isActive: true,
      isSuperAdmin: false,
    })

    // Réponse avec les données créées
    ctx.status = 201
    ctx.body = {
      tenant,
      roles: {
        admin: adminRole,
        user: userRole,
      },
      adminUser: {
        id: admin.get("id"),
        email: admin.get("email"),
      },
    }
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Désactiver un tenant (désactive tous les utilisateurs du tenant)
 */
export const disableTenant = async (ctx: Context) => {
  try {
    const tenantId = ctx.params.id

    // Vérifier que le tenant existe
    const tenant = await Tenant.findByPk(tenantId)
    if (!tenant) {
      ctx.status = 404
      ctx.body = { error: "Tenant not found" }
      return
    }

    // Désactiver tous les utilisateurs du tenant
    await User.update(
      { isActive: false },
      { where: { tenantId, isSuperAdmin: false } } // Ne pas désactiver les super admins
    )

    ctx.body = { message: `All users in tenant ${tenantId} have been disabled` }
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
