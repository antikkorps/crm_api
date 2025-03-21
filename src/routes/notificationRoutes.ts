import Router from "koa-router"
import {
  createNotification,
  createTemplate,
  deleteTemplate,
  getAllTemplates,
  getNotificationById,
  getTemplateById,
  getUnreadNotifications,
  getUserNotifications,
  markAllAsRead,
  markNotificationAsRead,
  previewTemplate,
  updateTemplate,
} from "../controllers/notificationController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/notifications" })

// Routes pour les notifications
router.get("/", checkPermission("notifications", "read"), getUserNotifications)
router.get("/unread", checkPermission("notifications", "read"), getUnreadNotifications)
router.get("/:id", checkPermission("notifications", "read"), getNotificationById)
router.post("/", checkPermission("notifications", "create"), createNotification)
router.post(
  "/:id/read",
  checkPermission("notifications", "update"),
  markNotificationAsRead
)
router.post("/mark-all-read", checkPermission("notifications", "update"), markAllAsRead)

// Routes pour les templates de notification
router.get("/templates", checkPermission("notifications", "read"), getAllTemplates)
router.get("/templates/:id", checkPermission("notifications", "read"), getTemplateById)
router.post("/templates", checkPermission("notifications", "create"), createTemplate)
router.put("/templates/:id", checkPermission("notifications", "update"), updateTemplate)
router.delete(
  "/templates/:id",
  checkPermission("notifications", "delete"),
  deleteTemplate
)
router.post(
  "/templates/preview",
  checkPermission("notifications", "read"),
  previewTemplate
)

export default router
