import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { Context } from "koa"
import { Role, Tenant, User } from "../models"
import type { UpdatePasswordRequest, UpdateProfileRequest } from "../types/models"

// Enregistrement d'un nouvel utilisateur
export const register = async (ctx: Context) => {
  try {
    const { email, password, firstName, lastName, tenantId, roleId } = ctx.request
      .body as any

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      where: {
        email,
        tenantId,
      },
    })

    if (existingUser) {
      ctx.status = 400
      ctx.body = { error: "Cet email est déjà utilisé pour ce tenant" }
      return
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Créer l'utilisateur
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      tenantId,
      roleId,
      isActive: true,
    })

    // Générer un token JWT
    const token = generateToken(user)

    // Réponse
    ctx.status = 201
    ctx.body = {
      id: user.get("id"),
      email: user.get("email"),
      firstName: user.get("firstName"),
      lastName: user.get("lastName"),
      tenantId: user.get("tenantId"),
      avatarUrl: user.get("avatarUrl"),
      phone: user.get("phone"),
      jobTitle: user.get("jobTitle"),
      bio: user.get("bio"),
      lastLoginAt: user.get("lastLoginAt"),
      token,
    }
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

// Connexion d'un utilisateur
export const login = async (ctx: Context) => {
  try {
    const { email, password, tenantDomain } = ctx.request.body as any

    // Si un domaine de tenant est fourni, chercher d'abord le tenant
    let tenantId: string | undefined
    if (tenantDomain) {
      const tenant = await Tenant.findOne({ where: { domain: tenantDomain } })
      if (!tenant) {
        ctx.status = 404
        ctx.body = { error: "Domaine non trouvé" }
        return
      }
      tenantId = tenant.get("id") as string
    }

    // Rechercher l'utilisateur
    const whereClause: any = { email }
    if (tenantId) whereClause.tenantId = tenantId

    const user = await User.findOne({
      where: whereClause,
      include: [{ model: Role }, { model: Tenant }],
    })

    // Vérifier si l'utilisateur existe
    if (!user) {
      ctx.status = 404
      ctx.body = { error: "Utilisateur non trouvé" }
      return
    }

    // Vérifier si l'utilisateur est actif
    if (!user.get("isActive")) {
      ctx.status = 401
      ctx.body = { error: "Compte désactivé" }
      return
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.get("password") as string)
    if (!isMatch) {
      ctx.status = 401
      ctx.body = { error: "Mot de passe incorrect" }
      return
    }

    // Mettre à jour la date de dernière connexion
    await user.update({ lastLoginAt: new Date() })

    // Générer un token JWT
    const token = generateToken(user)

    // Réponse
    ctx.status = 200
    ctx.body = {
      user: {
        id: user.get("id"),
        email: user.get("email"),
        firstName: user.get("firstName"),
        lastName: user.get("lastName"),
        tenantId: user.get("tenantId"),
        avatarUrl: user.get("avatarUrl"),
        phone: user.get("phone"),
        jobTitle: user.get("jobTitle"),
        bio: user.get("bio"),
        lastLoginAt: user.get("lastLoginAt"),
        role: user.get("Role"),
        tenant: user.get("Tenant"),
      },
      token,
    }
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

// Récupérer les données de l'utilisateur courant
export const getCurrentUser = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id

    const user = await User.findByPk(userId, {
      include: [{ model: Role }, { model: Tenant }],
      attributes: { exclude: ["password"] },
    })

    if (!user) {
      ctx.status = 404
      ctx.body = { error: "Utilisateur non trouvé" }
      return
    }

    ctx.status = 200
    ctx.body = {
      id: user.get("id"),
      email: user.get("email"),
      firstName: user.get("firstName"),
      lastName: user.get("lastName"),
      isActive: user.get("isActive"),
      isSuperAdmin: user.get("isSuperAdmin"),
      roleId: user.get("roleId"),
      tenantId: user.get("tenantId"),
      avatarUrl: user.get("avatarUrl"),
      phone: user.get("phone"),
      jobTitle: user.get("jobTitle"),
      bio: user.get("bio"),
      lastLoginAt: user.get("lastLoginAt"),
      createdAt: user.get("createdAt"),
      updatedAt: user.get("updatedAt"),
      role: user.get("Role"),
      tenant: user.get("Tenant"),
    }
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

// Mettre à jour le mot de passe de l'utilisateur
export const updatePassword = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id
    const { currentPassword, newPassword }: UpdatePasswordRequest = ctx.request
      .body as any

    // Validation des données
    if (!currentPassword || !newPassword) {
      ctx.status = 400
      ctx.body = { error: "L'ancien mot de passe et le nouveau mot de passe sont requis" }
      return
    }

    // Validation du nouveau mot de passe
    if (newPassword.length < 6) {
      ctx.status = 400
      ctx.body = { error: "Le nouveau mot de passe doit contenir au moins 6 caractères" }
      return
    }

    // Récupérer l'utilisateur avec le mot de passe
    const user = await User.findByPk(userId)
    if (!user) {
      ctx.status = 404
      ctx.body = { error: "Utilisateur non trouvé" }
      return
    }

    // Vérifier l'ancien mot de passe
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.get("password") as string
    )

    if (!isCurrentPasswordValid) {
      ctx.status = 401
      ctx.body = { error: "L'ancien mot de passe est incorrect" }
      return
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10)
    const hashedNewPassword = await bcrypt.hash(newPassword, salt)

    // Mettre à jour le mot de passe
    await user.update({ password: hashedNewPassword })

    ctx.status = 200
    ctx.body = {
      message: "Mot de passe mis à jour avec succès",
      success: true,
    }
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

// Mettre à jour le profil de l'utilisateur
export const updateProfile = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id
    const { firstName, lastName, phone, jobTitle, bio }: UpdateProfileRequest = ctx
      .request.body as any

    // Validation des données
    if (!firstName || !lastName) {
      ctx.status = 400
      ctx.body = { error: "Le prénom et le nom sont requis" }
      return
    }

    // Récupérer l'utilisateur
    const user = await User.findByPk(userId)
    if (!user) {
      ctx.status = 404
      ctx.body = { error: "Utilisateur non trouvé" }
      return
    }

    // Préparer les données à mettre à jour
    const updateData: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    }

    // Ajouter les champs optionnels s'ils sont fournis
    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null
    }
    if (jobTitle !== undefined) {
      updateData.jobTitle = jobTitle ? jobTitle.trim() : null
    }
    if (bio !== undefined) {
      updateData.bio = bio ? bio.trim() : null
    }

    // Mettre à jour l'utilisateur
    await user.update(updateData)

    // Récupérer l'utilisateur mis à jour avec les relations
    const updatedUser = await User.findByPk(userId, {
      include: [{ model: Role }, { model: Tenant }],
      attributes: { exclude: ["password"] },
    })

    ctx.status = 200
    ctx.body = {
      message: "Profil mis à jour avec succès",
      success: true,
      user: {
        id: updatedUser!.get("id"),
        email: updatedUser!.get("email"),
        firstName: updatedUser!.get("firstName"),
        lastName: updatedUser!.get("lastName"),
        isActive: updatedUser!.get("isActive"),
        isSuperAdmin: updatedUser!.get("isSuperAdmin"),
        roleId: updatedUser!.get("roleId"),
        tenantId: updatedUser!.get("tenantId"),
        avatarUrl: updatedUser!.get("avatarUrl"),
        phone: updatedUser!.get("phone"),
        jobTitle: updatedUser!.get("jobTitle"),
        bio: updatedUser!.get("bio"),
        lastLoginAt: updatedUser!.get("lastLoginAt"),
        createdAt: updatedUser!.get("createdAt"),
        updatedAt: updatedUser!.get("updatedAt"),
        role: updatedUser!.get("Role"),
        tenant: updatedUser!.get("Tenant"),
      },
    }
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

// Fonction utilitaire pour générer un token JWT
const generateToken = (user: any) => {
  const secret = process.env.JWT_SECRET || "your_jwt_secret"

  return jwt.sign(
    {
      id: user.get("id"),
      email: user.get("email"),
      tenantId: user.get("tenantId"),
    },
    secret,
    { expiresIn: "24h" }
  )
}
