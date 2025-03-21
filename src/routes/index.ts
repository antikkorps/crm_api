import Router from "koa-router"
import { authMiddleware } from "../middlewares/authMiddleware"
import activityRoutes from "./activityRoutes"
import analyticsRoutes from "./analyticsRoutes"
import authRoutes from "./authRoutes"
import companyRoutes from "./companyRoutes"
import contactRoutes from "./contactRoutes"
import noteRoutes from "./noteRoutes"
import reminderRoutes from "./reminderRoutes"
import roleRoutes from "./roleRoutes"
import segmentRoutes from "./segmentRoutes"
import statusRoutes from "./statusRoutes"
import superAdminRoutes from "./superAdminRoutes"
import tenantRoutes from "./tenantRoutes"
import userRoutes from "./userRoutes"

const router = new Router()

// Routes d'authentification (certaines publiques)
router.use(authRoutes.routes())

// Application du middleware d'authentification à toutes les autres routes
router.use(authMiddleware)

// Routes Super Admin
router.use(superAdminRoutes.routes())

// Routes API protégées
router.use(tenantRoutes.routes())
router.use(userRoutes.routes())
router.use(contactRoutes.routes())
router.use(companyRoutes.routes())
router.use(roleRoutes.routes())
router.use(statusRoutes.routes())
router.use(noteRoutes.routes())
router.use(activityRoutes.routes())
router.use(segmentRoutes.routes())
router.use(reminderRoutes.routes())
router.use(analyticsRoutes.routes())

export default router
