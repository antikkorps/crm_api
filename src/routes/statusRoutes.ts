import Router from "koa-router"
import {
  createStatus,
  deleteStatus,
  getAllStatuses,
  getStatusById,
  getStatusesByTenant,
  getStatusesByType,
  updateStatus,
} from "../controllers/statusController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/statuses" })

// Routes pour les statuts avec vérification des permissions
router.get("/", checkPermission("statuses", "read"), getAllStatuses)
router.get("/:id", checkPermission("statuses", "read"), getStatusById)
router.get("/tenant/:tenantId", checkPermission("statuses", "read"), getStatusesByTenant)
router.get("/type/:type", checkPermission("statuses", "read"), getStatusesByType)
router.post("/", checkPermission("statuses", "create"), createStatus)
router.put("/:id", checkPermission("statuses", "update"), updateStatus)
router.delete("/:id", checkPermission("statuses", "delete"), deleteStatus)

export default router
