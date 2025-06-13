import Router from "koa-router"
import {
  changePurchaseOrderStatus,
  convertQuoteToPurchaseOrder,
  createPurchaseOrder,
  deletePurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
} from "../controllers/purchaseOrderController"
import { checkPermission } from "../middlewares/roleMiddleware"
import { protectCrudRoutes } from "../utils/routeProtection"

const router = new Router({
  prefix: "/api/purchase-orders",
})

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     summary: Récupérer tous les bons de commande
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrer par statut
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Filtrer par entreprise
 *       - in: query
 *         name: contactId
 *         schema:
 *           type: string
 *         description: Filtrer par contact
 *       - in: query
 *         name: quoteId
 *         schema:
 *           type: string
 *         description: Filtrer par devis d'origine
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche textuelle
 *     responses:
 *       200:
 *         description: Liste des bons de commande
 *       401:
 *         description: Non authentifié
 */

// Protection des routes CRUD principales
protectCrudRoutes(router, "purchase-orders", {
  getAll: getAllPurchaseOrders,
  getById: getPurchaseOrderById,
  create: createPurchaseOrder,
  update: updatePurchaseOrder,
  delete: deletePurchaseOrder,
})

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   get:
 *     summary: Récupérer un bon de commande par son ID
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du bon de commande
 *     responses:
 *       200:
 *         description: Détails du bon de commande
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Bon de commande non trouvé
 */
// Note: Cette route est déjà gérée par protectCrudRoutes

/**
 * @swagger
 * /api/purchase-orders:
 *   post:
 *     summary: Créer un nouveau bon de commande
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - companyId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SENT, APPROVED, REJECTED, PARTIALLY_INVOICED, FULLY_INVOICED, CANCELLED]
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *               discountAmount:
 *                 type: number
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               notes:
 *                 type: string
 *               terms:
 *                 type: string
 *               quoteId:
 *                 type: string
 *               companyId:
 *                 type: string
 *               contactId:
 *                 type: string
 *               assignedToId:
 *                 type: string
 *               clientReference:
 *                 type: string
 *               termsAndConditionsId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Bon de commande créé
 *       401:
 *         description: Non authentifié
 *       400:
 *         description: Données invalides
 */
router.post("/", checkPermission("purchase-orders", "create"), createPurchaseOrder)

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   put:
 *     summary: Mettre à jour un bon de commande
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du bon de commande
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SENT, APPROVED, REJECTED, PARTIALLY_INVOICED, FULLY_INVOICED, CANCELLED]
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *               discountAmount:
 *                 type: number
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               notes:
 *                 type: string
 *               terms:
 *                 type: string
 *               contactId:
 *                 type: string
 *               companyId:
 *                 type: string
 *               assignedToId:
 *                 type: string
 *               clientReference:
 *                 type: string
 *               termsAndConditionsId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Bon de commande mis à jour
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Bon de commande non trouvé
 */
router.put("/:id", checkPermission("purchase-orders", "update"), updatePurchaseOrder)

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   delete:
 *     summary: Supprimer un bon de commande
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du bon de commande
 *     responses:
 *       204:
 *         description: Bon de commande supprimé
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Bon de commande non trouvé
 */
router.delete("/:id", checkPermission("purchase-orders", "delete"), deletePurchaseOrder)

/**
 * @swagger
 * /api/purchase-orders/{id}/status:
 *   patch:
 *     summary: Changer le statut d'un bon de commande
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du bon de commande
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SENT, APPROVED, REJECTED, PARTIALLY_INVOICED, FULLY_INVOICED, CANCELLED]
 *     responses:
 *       200:
 *         description: Statut du bon de commande mis à jour
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Bon de commande non trouvé
 */
router.patch(
  "/:id/status",
  checkPermission("purchase-orders", "update"),
  changePurchaseOrderStatus
)

/**
 * @swagger
 * /api/quotes/{quoteId}/convert-to-purchase-order:
 *   post:
 *     summary: Convertir un devis en bon de commande
 *     tags: [Purchase Orders, Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quoteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du devis à convertir
 *     responses:
 *       201:
 *         description: Bon de commande créé
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Devis non trouvé
 *       400:
 *         description: Devis déjà converti ou statut incorrect
 */
router.post(
  "/convert-from-quote/:quoteId",
  checkPermission("purchase-orders", "create"),
  convertQuoteToPurchaseOrder
)

export default router
