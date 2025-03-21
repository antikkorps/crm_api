import cors from "@koa/cors"
import Koa from "koa"
import bodyParser from "koa-bodyparser"
import Router from "koa-router"
import { sequelize, testConnection } from "./config/database"
import { initMailer, verifyMailerConnection } from "./config/mailer"
import { errorMiddleware } from "./middlewares/errorMiddleware"
import digiformaPlugin from "./plugins/lms/digiforma"
import { pluginRegistry } from "./plugins/registry"
import apiRoutes from "./routes"
import { seedDatabase } from "./seeders"
import { initializeWorkflowEngine } from "./services/workflowEngine"
import { DbErrorResponse, DbStatusResponse } from "./types/responses"
import { registerHelpers } from "./utils/templateRenderer"

require("dotenv").config()

const app = new Koa()
const router = new Router()
const PORT = process.env.PORT || 3030
const isDev = process.env.NODE_ENV === "development"

// Configuration des options CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*", // Accepte toutes les origines ou spécifie les origines autorisées
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "Accept"],
  exposeHeaders: ["Content-Length", "Date", "X-Request-Id"],
  maxAge: 86400, // 24 heures en secondes
  credentials: true, // Autorise l'envoi de cookies entre origines
}

// Middleware d'erreur - doit être le premier pour capturer toutes les erreurs
app.use(errorMiddleware)

// Autres middlewares
app.use(cors(corsOptions))
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
app.use(apiRoutes.routes()).use(apiRoutes.allowedMethods())

// Synchronisation de la base de données et démarrage du serveur
const startServer = async () => {
  try {
    // Test de la connexion à la base de données
    await testConnection()

    // Synchroniser les modèles avec la base de données
    // En production, utilisez des migrations au lieu de sync
    await sequelize.sync({ alter: true })
    console.log("✅ Database synchronized 🌐")

    // Exécuter les seeders en mode développement si SEED_ON_START est défini
    if (isDev && process.env.SEED_ON_START === "true") {
      try {
        await seedDatabase()
        console.log("✅ Database seeded successfully 🌱")
      } catch (seedError) {
        console.error("❌ Error seeding database 😞😞😞 :", seedError)
      }
    }

    // Initialiser le mailer
    await initMailer()
    
    // Vérifier la connexion au serveur email
    await verifyMailerConnection()
    
    // Enregistrer les helpers pour les templates
    registerHelpers()

    // Initialiser le moteur de workflow
    initializeWorkflowEngine()
    console.log("✅ Workflow engine initialized 🔄")

    // Enregistrer les plugins disponibles
    await pluginRegistry.register(digiformaPlugin)

    // Rechercher les intégrations actives dans la base de données
    const { ExternalIntegration } = require("./models")
    const activeIntegrations = await ExternalIntegration.findAll({
      where: { enabled: true },
    })

    // Initialiser et activer les plugins correspondants
    for (const integration of activeIntegrations) {
      try {
        const pluginId = `lms-${integration.get("provider")}`
        const plugin = pluginRegistry.getPlugin(pluginId)

        if (plugin) {
          const config = {
            apiKey: integration.get("apiKey"),
            apiSecret: integration.get("apiSecret"),
            baseUrl: integration.get("baseUrl"),
            ...integration.get("configuration"),
          }

          await pluginRegistry.initialize(pluginId, integration.get("tenantId"), config)
          await pluginRegistry.activate(pluginId)

          console.log(
            `Plugin ${pluginId} activated for tenant ${integration.get("tenantId")}`
          )
        }
      } catch (error) {
        console.error(
          `Failed to activate plugin for integration ${integration.get("id")}:`,
          error
        )
      }
    }

    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🎉🎉🎉 Server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error("❌ Failed to start server 😢😢😢 :", error)
  }
}

startServer()
