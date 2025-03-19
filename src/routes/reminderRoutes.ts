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

const router = new Router({ prefix: "/api/reminders" })

// Routes générales
router.get("/", getAllReminders)
router.get("/me", getCurrentUserReminders)
router.get("/upcoming", getUpcomingReminders)
router.get("/:id", getReminderById)
router.post("/", createReminder)
router.put("/:id", updateReminder)
router.patch("/:id/complete", markReminderAsComplete)
router.delete("/:id", deleteReminder)

// Routes spécialisées
router.get("/user/:userId", getRemindersByUser)
router.get("/contact/:contactId", getRemindersByContact)
router.get("/company/:companyId", getRemindersByCompany)

export default router
