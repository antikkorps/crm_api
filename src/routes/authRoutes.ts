import Router from "koa-router"
import { getCurrentUser, login, register } from "../controllers/authController"
import { authMiddleware } from "../middlewares/authMiddleware"

const router = new Router({ prefix: "/api/auth" })

// Routes publiques
router.post("/register", register)
router.post("/login", login)

// Routes protégées
router.get("/me", authMiddleware, getCurrentUser)

export default router
