import Koa from "koa"
import bodyParser from "koa-bodyparser"
import Router from "koa-router"
import { sequelize, testConnection } from "./config/database"
import apiRoutes from "./routes"
import { seedDatabase } from "./seeders" // Import du seeder
import { DbErrorResponse, DbStatusResponse } from "./types/responses"

require("dotenv").config()

const app = new Koa()
const router = new Router()
const PORT = process.env.PORT || 3030
const isDev = process.env.NODE_ENV === "development"

// Middleware
app.use(bodyParser())

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

// Route racine
router.get("/", async (ctx) => {
  ctx.body = "API is running"
})

// Utilisation des routes
app.use(router.routes()).use(router.allowedMethods()) // Routes de base
app.use(apiRoutes.routes()).use(apiRoutes.allowedMethods()) // Routes API importées

// Synchronisation de la base de données et démarrage du serveur
const startServer = async () => {
  try {
    // Test de la connexion à la base de données
    await testConnection()

    // Synchroniser les modèles avec la base de données
    // En production, utilisez des migrations au lieu de sync
    await sequelize.sync({ alter: true })
    console.log("Database synchronized")

    // Exécuter les seeders en mode développement si SEED_ON_START est défini
    if (isDev && process.env.SEED_ON_START === "true") {
      try {
        await seedDatabase()
        console.log("Database seeded successfully")
      } catch (seedError) {
        console.error("Error seeding database:", seedError)
      }
    }

    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error("Failed to start server:", error)
  }
}

startServer()
