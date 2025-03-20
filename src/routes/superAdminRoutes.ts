import Router from "koa-router"
import {
  createTenantWithInitialData,
  disableTenant,
  getAllTenantsWithStats,
} from "../controllers/superAdminController"
import { isSuperAdmin } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/super-admin" })

// Toutes les routes sont protégées par le middleware isSuperAdmin
router.use(isSuperAdmin)

// Routes pour gérer les tenants au niveau système
router.get("/tenants", getAllTenantsWithStats)
router.post("/tenants", createTenantWithInitialData)
router.post("/tenants/:id/disable", disableTenant)

export default router
