import Router from "koa-router"
import {
  createContact,
  deleteContact,
  getAllContacts,
  getContactById,
  getContactsByCompany,
  getContactsByTenant,
  updateContact,
} from "../controllers/contactController"

const router = new Router({ prefix: "/api/contacts" })

// Routes pour les contacts
router.get("/", getAllContacts)
router.get("/:id", getContactById)
router.get("/tenant/:tenantId", getContactsByTenant)
router.get("/company/:companyId", getContactsByCompany)
router.post("/", createContact)
router.put("/:id", updateContact)
router.delete("/:id", deleteContact)

export default router
