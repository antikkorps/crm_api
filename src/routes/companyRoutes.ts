import Router from "koa-router"
import {
  createCompany,
  deleteCompany,
  getAllCompanies,
  getCompaniesByTenant,
  getCompanyById,
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

export default router
