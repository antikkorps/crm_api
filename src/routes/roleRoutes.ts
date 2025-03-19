import Router from "koa-router"
import {
  createRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  getRolesByTenant,
  updateRole,
} from "../controllers/roleController"

const router = new Router({ prefix: "/api/roles" })

// Routes pour les rôles
router.get("/", getAllRoles)
router.get("/:id", getRoleById)
router.get("/tenant/:tenantId", getRolesByTenant)
router.post("/", createRole)
router.put("/:id", updateRole)
router.delete("/:id", deleteRole)

export default router
