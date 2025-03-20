import Router from "koa-router"
import {
  createNote,
  deleteNote,
  getAllNotes,
  getNoteById,
  getNotesByCompany,
  getNotesByContact,
  getNotesByTenant,
  updateNote,
} from "../controllers/noteController"
import { checkPermission } from "../middlewares/roleMiddleware"
import { protectCrudRoutes } from "../utils/routeProtection"

const router = new Router({ prefix: "/api/notes" })

// Protection des routes CRUD principales
protectCrudRoutes(router, "notes", {
  getAll: getAllNotes,
  getById: getNoteById,
  create: createNote,
  update: updateNote,
  delete: deleteNote,
})

// Routes spécialisées avec leurs propres protections
router.get("/contact/:contactId", checkPermission("notes", "read"), getNotesByContact)

router.get("/company/:companyId", checkPermission("notes", "read"), getNotesByCompany)

router.get("/tenant/:tenantId", checkPermission("notes", "read"), getNotesByTenant)

export default router
