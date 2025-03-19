import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { Context } from "koa"
import { Role, Tenant, User } from "../models"

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
    ctx.body = user
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
