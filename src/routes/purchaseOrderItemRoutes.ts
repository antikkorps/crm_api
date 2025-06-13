import Router from "koa-router"
import {
  getPurchaseOrderItemById,
  getPurchaseOrderItems,
  updateInvoicedQuantity,
} from "../controllers/purchaseOrderItemController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({
  prefix: "/api/purchase-order-items",
})

/**
 * @swagger
 * /api/purchase-order-items/by-purchase-order/{purchaseOrderId}:
 *   get:
 *     summary: Récupérer les éléments d'un bon de commande par son ID
 *     tags: [Purchase Order Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: purchaseOrderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du bon de commande
 *     responses:
 *       200:
 *         description: Liste des éléments du bon de commande
 *       401:
 *         description: Non authentifié
 */
router.get(
  "/by-purchase-order/:purchaseOrderId",
  checkPermission("purchase-orders", "read"),
  getPurchaseOrderItems
)

/**
 * @swagger
 * /api/purchase-order-items/{id}:
 *   get:
 *     summary: Récupérer un élément de bon de commande par son ID
 *     tags: [Purchase Order Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'élément du bon de commande
 *     responses:
 *       200:
 *         description: Détails de l'élément du bon de commande
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Élément non trouvé
 */
router.get("/:id", checkPermission("purchase-orders", "read"), getPurchaseOrderItemById)

/**
 * @swagger
 * /api/purchase-order-items/{id}/invoiced-quantity:
 *   patch:
 *     summary: Mettre à jour la quantité facturée d'un élément de bon de commande
 *     tags: [Purchase Order Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'élément du bon de commande
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoicedQuantity
 *             properties:
 *               invoicedQuantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Quantité facturée mise à jour
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Élément non trouvé
 *       400:
 *         description: Quantité facturée supérieure à la quantité totale
 */
router.patch(
  "/:id/invoiced-quantity",
  checkPermission("purchase-orders", "update"),
  updateInvoicedQuantity
)

export default router
