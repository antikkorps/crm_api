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
import { checkPermission } from "../middlewares/roleMiddleware"
import { protectCrudRoutes } from "../utils/routeProtection"

const router = new Router({ prefix: "/api/quotes" })

// Protection des routes CRUD principales
protectCrudRoutes(router, "quotes", {
  getAll: getAllQuotes,
  getById: getQuoteById,
  create: createQuote,
  update: updateQuote,
  delete: deleteQuote,
})
// Routes spéciales pour les quotes
router.post("/:id/status", checkPermission("quotes", "update"), changeQuoteStatus)
router.post("/:id/duplicate", checkPermission("quotes", "create"), duplicateQuote)

export default router
