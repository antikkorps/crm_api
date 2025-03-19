import Router from "koa-router"
import tenantRoutes from "./tenantRoutes"
import userRoutes from "./userRoutes"

const router = new Router()

// Routes API
router.use(tenantRoutes.routes())
router.use(userRoutes.routes())

export default router
