import Koa from "koa"
import bodyParser from "koa-bodyparser"
import Router from "koa-router"
import { sequelize, testConnection } from "./config/database"
import { DbErrorResponse, DbStatusResponse } from "./types/responses"

require("dotenv").config()

const app = new Koa()
const router = new Router()
const PORT = process.env.PORT || 3030

// Middleware
app.use(bodyParser())

// Routes
app.use(async (ctx) => {
  ctx.body = "API is running"
})

// Test route to check database connection
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

// Utilisation des routes
app.use(router.routes()).use(router.allowedMethods())

// Synchronisation de la base de données et démarrage du serveur
const startServer = async () => {
  try {
    // Test de la connexion à la base de données
    await testConnection()

    // Synchroniser les modèles avec la base de données
    // En production, utilisez des migrations au lieu de sync
    await sequelize.sync({ alter: true })
    console.log("Database synchronized")

    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error("Failed to start server:", error)
  }
}

startServer()
