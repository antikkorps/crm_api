import Router from "koa-router"
import {
  createTenant,
  deleteTenant,
  getAllTenants,
  getTenantById,
  updateTenant,
} from "../controllers/tenantController"
import { checkPermission, isAdmin } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/tenants" })

// Routes simplifiées utilisant les contrôleurs et la gestion des rôles
router.get("/", checkPermission("tenant", "read"), getAllTenants)
router.get("/:id", checkPermission("tenant", "read"), getTenantById)
router.post("/", isAdmin, createTenant) // Seuls les admins peuvent créer des tenants
router.put("/:id", checkPermission("tenant", "update"), updateTenant)
router.delete("/:id", isAdmin, deleteTenant) // Seuls les admins peuvent supprimer des tenants

export default router
