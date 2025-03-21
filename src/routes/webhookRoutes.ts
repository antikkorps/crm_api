import Router from "koa-router"
import {
  createWebhook,
  deleteWebhook,
  getAllWebhooks,
  getWebhookById,
  getWebhookExecutionHistory,
  regenerateWebhookSecret,
  testWebhook,
  updateWebhook,
} from "../controllers/webhookController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/webhooks" })

// Routes pour les webhooks
router.get("/", checkPermission("webhooks", "read"), getAllWebhooks)
router.get("/:id", checkPermission("webhooks", "read"), getWebhookById)
router.post("/", checkPermission("webhooks", "create"), createWebhook)
router.put("/:id", checkPermission("webhooks", "update"), updateWebhook)
router.delete("/:id", checkPermission("webhooks", "delete"), deleteWebhook)
router.post(
  "/:id/secret/regenerate",
  checkPermission("webhooks", "update"),
  regenerateWebhookSecret
)
router.post("/:id/test", checkPermission("webhooks", "update"), testWebhook)
router.get(
  "/:id/history",
  checkPermission("webhooks", "read"),
  getWebhookExecutionHistory
)

export default router
