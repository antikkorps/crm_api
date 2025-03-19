import Router from "koa-router"
import {
  createTenant,
  deleteTenant,
  getAllTenants,
  getTenantById,
  updateTenant,
} from "../controllers/tenantController"

const router = new Router({ prefix: "/api/tenants" })

// Routes simplifiées utilisant les contrôleurs
router.get("/", getAllTenants)
router.get("/:id", getTenantById)
router.post("/", createTenant)
router.put("/:id", updateTenant)
router.delete("/:id", deleteTenant)

export default router
