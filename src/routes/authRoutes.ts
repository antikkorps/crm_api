import Router from "koa-router"
import {
  getCurrentUser,
  login,
  register,
  updatePassword,
  updateProfile,
} from "../controllers/authController"
import { authMiddleware } from "../middlewares/authMiddleware"

const router = new Router({ prefix: "/api/auth" })

// Routes publiques
router.post("/register", register)
router.post("/login", login)

// Routes protégées
router.get("/me", authMiddleware, getCurrentUser)
router.put("/update-password", authMiddleware, updatePassword)
router.put("/update-profile", authMiddleware, updateProfile)

export default router
