import Router from "koa-router"
import {
  getActivityTrends,
  getCompanyStatusDistribution,
  getContactStatusDistribution,
  getDashboardSummary,
  getOpportunitiesByMonth,
  getOpportunitiesPipeline,
  getOpportunitiesValueSummary,
  getReminderStats,
  getUserPerformance,
} from "../controllers/analyticsController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/v1/analytics" })

// Dashboard routes
router.get(
  "/dashboard-summary",
  checkPermission("analytics", "read"),
  getDashboardSummary
)
router.get(
  "/contact-status",
  checkPermission("analytics", "read"),
  getContactStatusDistribution
)
router.get(
  "/company-status",
  checkPermission("analytics", "read"),
  getCompanyStatusDistribution
)
router.get("/activity-trends", checkPermission("analytics", "read"), getActivityTrends)
router.get("/user-performance", checkPermission("analytics", "read"), getUserPerformance)
router.get("/reminder-stats", checkPermission("analytics", "read"), getReminderStats)

// Pipeline routes that match the frontend service
router.get(
  "/opportunities-pipeline",
  checkPermission("analytics", "read"),
  getOpportunitiesPipeline
)
router.get(
  "/opportunities-by-month",
  checkPermission("analytics", "read"),
  getOpportunitiesByMonth
)
router.get(
  "/opportunities-value-summary",
  checkPermission("analytics", "read"),
  getOpportunitiesValueSummary
)

export default router
