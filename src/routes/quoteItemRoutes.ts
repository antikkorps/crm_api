import Router from "koa-router"
import {
  getProductForQuoteItem,
  getProductUsageStats,
  searchProductsForQuoteItem,
} from "../controllers/quoteItemController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/quote-items" })

// Routes pour la gestion des éléments de devis
router.get(
  "/products/search",
  checkPermission("quotes", "read"),
  searchProductsForQuoteItem
)
router.get("/products/:id", checkPermission("quotes", "read"), getProductForQuoteItem)
router.get("/products/:id/usage", checkPermission("quotes", "read"), getProductUsageStats)

export default router
