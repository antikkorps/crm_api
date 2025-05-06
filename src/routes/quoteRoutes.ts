import Router from "koa-router"
import {
  changeQuoteStatus,
  createQuote,
  deleteQuote,
  duplicateQuote,
  getAllQuotes,
  getQuoteById,
  updateQuote,
} from "../controllers/quoteController"
import { authMiddleware } from "../middlewares/authMiddleware"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/quotes" })

// Middleware d'authentification pour toutes les routes
router.use(authMiddleware)

// Routes pour les devis
router.get("/", getAllQuotes)
router.get("/:id", getQuoteById)
router.post("/", createQuote)
router.put("/:id", updateQuote)
router.delete("/:id", checkPermission("quotes", "delete"), deleteQuote)
router.post("/:id/status", changeQuoteStatus)
router.post("/:id/duplicate", duplicateQuote)

export default router
