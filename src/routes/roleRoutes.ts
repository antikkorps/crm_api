import Router from "koa-router"
import {
  createRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  getRolesByTenant,
  updateRole,
} from "../controllers/roleController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/roles" })

// Routes pour les rôles avec vérification des permissions
router.get("/", checkPermission("roles", "read"), getAllRoles)
router.get("/:id", checkPermission("roles", "read"), getRoleById)
router.get("/tenant/:tenantId", checkPermission("roles", "read"), getRolesByTenant)

// Création et modification de rôles - généralement réservé aux administrateurs
router.post("/", checkPermission("roles", "create"), createRole)
router.put("/:id", checkPermission("roles", "update"), updateRole)
router.delete("/:id", checkPermission("roles", "delete"), deleteRole)

export default router
