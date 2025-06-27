import Router from "koa-router"
import {
  getCurrentUser,
  login,
  register,
  updateAvatar,
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
router.put("/update-avatar", authMiddleware, updateAvatar)

export default router
