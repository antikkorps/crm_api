import Router from "koa-router"
import {
  addSpecialitiesToCompany,
  createCompany,
  deleteCompany,
  getAllCompanies,
  getCompaniesByTenant,
  getCompanyById,
  removeSpecialitiesFromCompany,
  searchCompanies,
  updateCompany,
} from "../controllers/companyController"
import { checkPermission } from "../middlewares/roleMiddleware"
import { protectCrudRoutes } from "../utils/routeProtection"

const router = new Router({ prefix: "/api/companies" })

// Route de recherche avec filtres
router.get("/search", checkPermission("companies", "read"), searchCompanies)

// Protection des routes CRUD principales
protectCrudRoutes(router, "companies", {
  getAll: getAllCompanies,
  getById: getCompanyById,
  create: createCompany,
  update: updateCompany,
  delete: deleteCompany,
})

// Routes spécialisées avec leurs propres protections
router.get(
  "/tenant/:tenantId",
  checkPermission("companies", "read"),
  getCompaniesByTenant
)

// Routes pour gérer les spécialités d'une entreprise
router.post(
  "/:id/specialities",
  checkPermission("companies", "update"),
  addSpecialitiesToCompany
)

router.delete(
  "/:id/specialities",
  checkPermission("companies", "update"),
  removeSpecialitiesFromCompany
)

export default router
