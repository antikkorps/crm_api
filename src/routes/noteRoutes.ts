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

const router = new Router({ prefix: "/api/notes" })

// Routes générales
router.get("/", getAllNotes)
router.get("/:id", getNoteById)
router.post("/", createNote)
router.put("/:id", updateNote)
router.delete("/:id", deleteNote)

// Routes spécialisées
router.get("/contact/:contactId", getNotesByContact)
router.get("/company/:companyId", getNotesByCompany)
router.get("/tenant/:tenantId", getNotesByTenant)

export default router
