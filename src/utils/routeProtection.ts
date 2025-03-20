import Router from "koa-router"
import { checkPermission } from "../middlewares/roleMiddleware"

/**
 * Configure les routes CRUD standards avec les vérifications de permissions appropriées
 */
export const protectCrudRoutes = (
  router: Router,
  resource: string,
  controllers: {
    getAll: Router.IMiddleware
    getById: Router.IMiddleware
    create: Router.IMiddleware
    update: Router.IMiddleware
    delete: Router.IMiddleware
  }
) => {
  router.get("/", checkPermission(resource, "read"), controllers.getAll)
  router.get("/:id", checkPermission(resource, "read"), controllers.getById)
  router.post("/", checkPermission(resource, "create"), controllers.create)
  router.put("/:id", checkPermission(resource, "update"), controllers.update)
  router.delete("/:id", checkPermission(resource, "delete"), controllers.delete)
}
