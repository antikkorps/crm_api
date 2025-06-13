import Router from "koa-router"
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  getProductCategories,
  toggleProductStatus,
  updateProduct,
} from "../controllers/productController"
import { checkPermission } from "../middlewares/roleMiddleware"
import { protectCrudRoutes } from "../utils/routeProtection"

const router = new Router({ prefix: "/api/products" })

// Protection des routes CRUD principales
protectCrudRoutes(router, "products", {
  getAll: getAllProducts,
  getById: getProductById,
  create: createProduct,
  update: updateProduct,
  delete: deleteProduct,
})

// Routes spécialisées avec leurs propres protections
router.get("/categories", checkPermission("products", "read"), getProductCategories)
router.patch("/:id/status", checkPermission("products", "update"), toggleProductStatus)

export default router
