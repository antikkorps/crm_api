import { Transaction } from "sequelize"
import { PurchaseOrder, PurchaseOrderItem, Quote, QuoteItem } from "../models"
import { PurchaseOrderStatus } from "../models/purchaseOrder"
import { NotFoundError } from "../utils/errors"

/**
 * Convertit un devis en bon de commande
 * @param quoteId ID du devis à convertir
 * @param userId ID de l'utilisateur effectuant la conversion
 * @param tenantId ID du tenant
 * @param transaction Transaction Sequelize optionnelle
 * @returns Le bon de commande créé
 */
export async function convertQuoteToPurchaseOrder(
  quoteId: string,
  userId: string,
  tenantId: string,
  transaction?: Transaction
) {
  // Récupérer le devis avec ses éléments
  const quote = await Quote.findOne({
    where: {
      id: quoteId,
      tenantId,
    },
    include: [
      {
        model: QuoteItem,
        as: "items", // Assurez-vous que l'alias correspond à celui défini dans vos associations
      },
    ],
    transaction,
  })

  if (!quote) {
    throw new NotFoundError(`Quote with ID ${quoteId} not found`)
  }

  // Vérifier que le devis est dans un état qui permet la conversion
  const quoteStatus = quote.get("status")
  if (quoteStatus !== "ACCEPTED") {
    throw new Error("Only accepted quotes can be converted to purchase orders")
  }

  // Créer le bon de commande
  const purchaseOrder = await PurchaseOrder.create(
    {
      title: `PO: ${quote.get("title")}`,
      description: quote.get("description"),
      status: PurchaseOrderStatus.DRAFT,
      reference: generatePurchaseOrderReference(),
      companyId: quote.get("companyId"),
      contactId: quote.get("contactId"),
      validUntil: quote.get("validUntil"),
      discountAmount: quote.get("discountAmount"),
      discountType: quote.get("discountType"),
      taxRate: quote.get("taxRate"),
      notes: quote.get("notes"),
      terms: quote.get("terms"),
      quoteId: quote.get("id"),
      createdById: userId,
      assignedToId: userId,
      termsAndConditionsId: quote.get("termsAndConditionsId"),
      totalAmount: quote.get("totalAmount"),
      taxes: quote.get("taxes"),
      tenantId,
    },
    { transaction }
  )

  // Récupérer les éléments du devis
  const items = quote.get("items") || []

  if (!items || !Array.isArray(items)) {
    throw new Error("Quote items not found or not accessible")
  }

  // Créer les éléments du bon de commande
  await Promise.all(
    items.map(async (quoteItem) => {
      await PurchaseOrderItem.create(
        {
          purchaseOrderId: purchaseOrder.get("id"),
          productId: quoteItem.get("productId"),
          description: quoteItem.get("description"),
          quantity: quoteItem.get("quantity"),
          unitPrice: quoteItem.get("unitPrice"),
          discount: quoteItem.get("discount"),
          discountType: quoteItem.get("discountType"),
          taxRate: quoteItem.get("taxRate"),
          totalPrice: quoteItem.get("totalPrice"),
          position: quoteItem.get("position"),
        },
        { transaction }
      )
    })
  )

  // Mettre à jour le statut du devis
  await quote.update(
    {
      status: "CONVERTED_TO_PO",
      convertedToId: purchaseOrder.get("id"),
      convertedToType: "PURCHASE_ORDER",
    },
    { transaction }
  )

  return purchaseOrder
}

/**
 * Générer une référence unique pour le bon de commande
 */
function generatePurchaseOrderReference(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")
  return `PO-${year}${month}-${random}`
}

export default { convertQuoteToPurchaseOrder }
