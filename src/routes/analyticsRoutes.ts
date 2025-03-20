import Router from "koa-router"
import {
  getActivityTrends,
  getCompanyStatusDistribution,
  getContactStatusDistribution,
  getDashboardSummary,
  getReminderStats,
  getUserPerformance,
} from "../controllers/analyticsController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/analytics" })

// Toutes les routes d'analytics nécessitent au minimum une permission de lecture
router.get("/dashboard", checkPermission("dashboard", "read"), getDashboardSummary)
router.get(
  "/contacts/status",
  checkPermission("dashboard", "read"),
  getContactStatusDistribution
)
router.get(
  "/companies/status",
  checkPermission("dashboard", "read"),
  getCompanyStatusDistribution
)
router.get("/trends", checkPermission("dashboard", "read"), getActivityTrends)
router.get("/performance", checkPermission("dashboard", "read"), getUserPerformance)
router.get("/reminders", checkPermission("dashboard", "read"), getReminderStats)

export default router
