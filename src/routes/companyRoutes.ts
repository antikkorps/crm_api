import Router from "koa-router"
import {
  createCompany,
  deleteCompany,
  getAllCompanies,
  getCompaniesByTenant,
  getCompanyById,
  updateCompany,
} from "../controllers/companyController"

const router = new Router({ prefix: "/api/companies" })

// Routes pour les entreprises
router.get("/", getAllCompanies)
router.get("/:id", getCompanyById)
router.get("/tenant/:tenantId", getCompaniesByTenant)
router.post("/", createCompany)
router.put("/:id", updateCompany)
router.delete("/:id", deleteCompany)

export default router
