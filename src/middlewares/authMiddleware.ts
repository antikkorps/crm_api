import jwt from "jsonwebtoken"
import { Context, Next } from "koa"
import { User } from "../models"

// Interface pour les données décodées du token
interface TokenPayload {
  id: string
  email: string
  tenantId: string
  iat?: number
  exp?: number
}

// Middleware d'authentification
export const authMiddleware = async (ctx: Context, next: Next) => {
  try {
    // Récupérer le token d'authentification
    const authHeader = ctx.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.status = 401
      ctx.body = { error: "Authentification requise" }
      return
    }

    // Extraire le token
    const token = authHeader.split(" ")[1]

    // Vérifier le token JWT
    const secret = process.env.JWT_SECRET
    if (!secret) {
      ctx.status = 500
      ctx.body = { error: "Configuration du serveur incorrecte" }
      return
    }

    // Décoder le token
    const decoded = jwt.verify(token, secret) as TokenPayload

    // Vérifier l'utilisateur dans la base de données
    const user = await User.findByPk(decoded.id)
    if (!user) {
      ctx.status = 401
      ctx.body = { error: "Utilisateur non trouvé" }
      return
    }

    // Vérifier si l'utilisateur est actif
    if (!user.get("isActive")) {
      ctx.status = 401
      ctx.body = { error: "Compte désactivé" }
      return
    }

    // Ajouter les informations utilisateur au contexte
    ctx.state.user = {
      id: user.get("id"),
      email: user.get("email"),
      firstName: user.get("firstName"),
      lastName: user.get("lastName"),
      tenantId: user.get("tenantId"),
      roleId: user.get("roleId"),
    }

    // Passer au middleware suivant
    await next()
  } catch (error) {
    // Gérer les erreurs JWT
    if (error instanceof jwt.JsonWebTokenError) {
      ctx.status = 401
      ctx.body = { error: "Token invalide" }
      return
    }

    if (error instanceof jwt.TokenExpiredError) {
      ctx.status = 401
      ctx.body = { error: "Token expiré" }
      return
    }

    // Autres erreurs
    ctx.status = 500
    ctx.body = { error: "Erreur d'authentification" }
  }
}
