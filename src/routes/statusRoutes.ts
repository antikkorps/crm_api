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

const router = new Router({ prefix: "/api/statuses" })

// Routes pour les statuts
router.get("/", getAllStatuses)
router.get("/:id", getStatusById)
router.get("/tenant/:tenantId", getStatusesByTenant)
router.get("/type/:type", getStatusesByType)
router.post("/", createStatus)
router.put("/:id", updateStatus)
router.delete("/:id", deleteStatus)

export default router
