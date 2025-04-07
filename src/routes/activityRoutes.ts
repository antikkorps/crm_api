import Router from "koa-router"
import {
  createActivity,
  deleteActivity,
  getActivitiesByCompany,
  getActivitiesByContact,
  getActivitiesByType,
  getActivitiesByUser,
  getActivityById,
  getAllActivities,
  getMyTasks,
  getRecentActivities,
  updateActivity,
} from "../controllers/activityController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/activities" })

// Routes principales - mettre les routes spécifiques AVANT la route /:id
router.get("/", checkPermission("activities", "read"), getAllActivities)
router.get("/recent", checkPermission("activities", "read"), getRecentActivities)
router.get("/type/:type", checkPermission("activities", "read"), getActivitiesByType)
router.get("/my-tasks", checkPermission("activities", "read"), getMyTasks)

// Routes spécialisées
router.get(
  "/contact/:contactId",
  checkPermission("activities", "read"),
  getActivitiesByContact
)
router.get(
  "/company/:companyId",
  checkPermission("activities", "read"),
  getActivitiesByCompany
)
router.get("/user", checkPermission("activities", "read"), getActivitiesByUser)
router.get("/user/:userId", checkPermission("activities", "read"), getActivitiesByUser)

// Route générique
router.get("/:id", checkPermission("activities", "read"), getActivityById)

// Routes de modification
router.post("/", checkPermission("activities", "create"), createActivity)
router.put("/:id", checkPermission("activities", "update"), updateActivity)
router.delete("/:id", checkPermission("activities", "delete"), deleteActivity)

export default router
