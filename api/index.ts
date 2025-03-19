// SI DEPLOYE SUR VERCEL
// AJOUTER /api/index.ts en main dans le package.json et dans le script start
// "start": "node api/index.ts"
//
import Koa from "koa"
import bodyParser from "koa-bodyparser"
import Router from "koa-router"
import { sequelize, testConnection } from "../src/config/database"
import apiRoutes from "../src/routes"
import { DbErrorResponse, DbStatusResponse } from "../src/types/responses"

// Configuration
require("dotenv").config()

const app = new Koa()
const router = new Router()

// Middleware
app.use(bodyParser())

// Test route pour vérifier la connexion à la base de données
router.get("/db-status", async (ctx: Koa.Context): Promise<void> => {
  try {
    await sequelize.authenticate()
    ctx.body = { status: "Connected to database successfully" } as DbStatusResponse
  } catch (error: any) {
    ctx.status = 500
    ctx.body = {
      error: "Database connection error",
      details: error.message,
    } as DbErrorResponse
  }
})

// Route racine
router.get("/", async (ctx) => {
  ctx.body = "API is running"
})

// Utilisation des routes
app.use(router.routes()).use(router.allowedMethods()) // Routes de base
app.use(apiRoutes.routes()).use(apiRoutes.allowedMethods()) // Routes API importées

// Handler pour Vercel
const handler = async (req: any, res: any) => {
  // Initialiser la base de données au démarrage
  try {
    await testConnection()

    // En production, évitez d'utiliser sync sur Vercel
    // La synchronisation doit être effectuée lors du déploiement initial ou via des migrations
    if (process.env.VERCEL_ENV === "development") {
      await sequelize.sync({ alter: true })
      console.log("Database synchronized")
    }
  } catch (error) {
    console.error("Database initialization error:", error)
  }

  // Créer un contexte pour Koa à partir de la requête et réponse de Vercel
  const ctx: any = app.createContext(req, res)

  try {
    // Traiter la requête avec Koa
    await new Promise<void>((resolve) => {
      ctx.res.on("finish", resolve)
      app.callback()(ctx.req, ctx.res)
    })
  } catch (error) {
    console.error("Request processing error:", error)
    res.statusCode = 500
    res.end("Internal Server Error")
  }
}

// Exportation pour Vercel
module.exports = handler
