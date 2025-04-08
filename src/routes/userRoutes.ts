import Router from "koa-router"
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  getUsersByTenant,
  updateUser,
  uploadAvatar
} from "../controllers/userController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/users" })

// Routes simplifiées utilisant les contrôleurs et la gestion des rôles
router.get("/", checkPermission("users", "read"), getAllUsers)
router.get("/:id", checkPermission("users", "read"), getUserById)
router.get("/tenant/:tenantId", checkPermission("users", "read"), getUsersByTenant)
router.post("/", checkPermission("users", "create"), createUser)
router.put("/:id", checkPermission("users", "update"), updateUser)
router.delete("/:id", checkPermission("users", "delete"), deleteUser)

// Avatar upload route
router.post("/:id/avatar", checkPermission("users", "update"), uploadAvatar)

export default router
