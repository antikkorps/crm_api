import Router from "koa-router"
import { authMiddleware } from "../middlewares/authMiddleware"
import authRoutes from "./authRoutes"
import superAdminRoutes from "./superAdminRoutes"
import v1Routes from "./v1"

const router = new Router()

// Routes d'authentification (certaines publiques)
router.use(authRoutes.routes())

// Application du middleware d'authentification à toutes les autres routes
router.use(authMiddleware)

// Routes Super Admin
router.use(superAdminRoutes.routes())

// Routes API versionnées (v1)
router.use("/api/v1", v1Routes.routes())

// Redirection des routes non versionnées vers la version actuelle (v1)
// Ces routes conservent leur préfixe /api/ mais sont redirigées vers la v1
router.use("/api", v1Routes.routes())

export default router
