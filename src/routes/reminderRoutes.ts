import Router from "koa-router"
import {
  createReminder,
  deleteReminder,
  getAllReminders,
  getCurrentUserReminders,
  getReminderById,
  getRemindersByCompany,
  getRemindersByContact,
  getRemindersByUser,
  getUpcomingReminders,
  markReminderAsComplete,
  updateReminder,
} from "../controllers/reminderController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/reminders" })

// Routes générales avec vérification des permissions
router.get("/", checkPermission("reminders", "read"), getAllReminders)
router.get("/me", checkPermission("reminders", "read"), getCurrentUserReminders)
router.get("/upcoming", checkPermission("reminders", "read"), getUpcomingReminders)
router.get("/:id", checkPermission("reminders", "read"), getReminderById)
router.post("/", checkPermission("reminders", "create"), createReminder)
router.put("/:id", checkPermission("reminders", "update"), updateReminder)
router.patch(
  "/:id/complete",
  checkPermission("reminders", "update"),
  markReminderAsComplete
)
router.delete("/:id", checkPermission("reminders", "delete"), deleteReminder)

// Routes spécialisées avec leurs propres protections
router.get("/user/:userId", checkPermission("reminders", "read"), getRemindersByUser)

router.get(
  "/contact/:contactId",
  checkPermission("reminders", "read"),
  getRemindersByContact
)

router.get(
  "/company/:companyId",
  checkPermission("reminders", "read"),
  getRemindersByCompany
)

export default router
