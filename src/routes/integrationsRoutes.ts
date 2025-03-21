import Router from "koa-router"
import {
  activatePlugin,
  createIntegration,
  deactivatePlugin,
  deleteIntegration,
  getAllIntegrations,
  getAvailablePlugins,
  getIntegrationById,
  updateIntegration,
} from "../controllers/integrationsController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/integrations" })

// Routes pour les intégrations
router.get("/", checkPermission("integrations", "read"), getAllIntegrations)
router.get(
  "/available-plugins",
  checkPermission("integrations", "read"),
  getAvailablePlugins
)
router.get("/:id", checkPermission("integrations", "read"), getIntegrationById)
router.post("/", checkPermission("integrations", "create"), createIntegration)
router.put("/:id", checkPermission("integrations", "update"), updateIntegration)
router.delete("/:id", checkPermission("integrations", "delete"), deleteIntegration)

// Routes pour activer/désactiver les plugins
router.post(
  "/plugins/activate",
  checkPermission("integrations", "update"),
  activatePlugin
)
router.post(
  "/plugins/:pluginId/deactivate",
  checkPermission("integrations", "update"),
  deactivatePlugin
)

export default router
