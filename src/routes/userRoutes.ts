import Router from "koa-router"
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  getUsersByTenant,
  updateUser,
} from "../controllers/userController"

const router = new Router({ prefix: "/api/users" })

// Routes simplifiées utilisant les contrôleurs
router.get("/", getAllUsers)
router.get("/:id", getUserById)
router.get("/tenant/:tenantId", getUsersByTenant)
router.post("/", createUser)
router.put("/:id", updateUser)
router.delete("/:id", deleteUser)

export default router
