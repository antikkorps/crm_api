import Router from "koa-router"
import {
  createSpeciality,
  deleteSpeciality,
  getAllSpecialities,
  getSpecialityById,
  searchSpecialities,
  updateSpeciality,
} from "../controllers/specialityController"
import { checkPermission } from "../middlewares/roleMiddleware"
import { protectCrudRoutes } from "../utils/routeProtection"

const router = new Router({ prefix: "/api/specialities" })

// Route de recherche avec filtres
router.get("/search", checkPermission("specialities", "read"), searchSpecialities)

// Protection des routes CRUD principales
protectCrudRoutes(router, "specialities", {
  getAll: getAllSpecialities,
  getById: getSpecialityById,
  create: createSpeciality,
  update: updateSpeciality,
  delete: deleteSpeciality,
})

export default router
