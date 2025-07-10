import Router from "koa-router"
import {
  createContact,
  deleteContact,
  getAllContacts,
  getContactById,
  getContactStats,
  getContactsByCompany,
  getContactsByTenant,
  updateContact,
} from "../controllers/contactController"
import { checkPermission } from "../middlewares/roleMiddleware"
import { protectCrudRoutes } from "../utils/routeProtection"

const router = new Router({ prefix: "/api/contacts" })

// Route pour les statistiques
router.get("/stats", checkPermission("contacts", "read"), getContactStats)

// Protection des routes CRUD principales
protectCrudRoutes(router, "contacts", {
  getAll: getAllContacts,
  getById: getContactById,
  create: createContact,
  update: updateContact,
  delete: deleteContact,
})

// Routes spécialisées avec leurs propres protections
router.get("/tenant/:tenantId", checkPermission("contacts", "read"), getContactsByTenant)

router.get(
  "/company/:companyId",
  checkPermission("contacts", "read"),
  getContactsByCompany
)

export default router
