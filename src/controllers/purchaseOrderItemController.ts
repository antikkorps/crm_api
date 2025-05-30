import { Context } from "koa"
import { Product, PurchaseOrderItem } from "../models"
import { BadRequestError, NotFoundError } from "../utils/errors"

/**
 * Récupérer les éléments d'un bon de commande
 */
export const getPurchaseOrderItems = async (ctx: Context) => {
  try {
    const { purchaseOrderId } = ctx.params
    const tenantId = ctx.state.user.tenantId

    const items = await PurchaseOrderItem.findAll({
      where: {
        purchaseOrderId,
      },
      include: [
        {
          model: Product,
          attributes: ["id", "name", "code", "category", "unitPrice", "taxRate"],
        },
      ],
      order: [["position", "ASC"]],
    })

    ctx.body = items
  } catch (error) {
    console.error("Error getting purchase order items:", error)
    throw error
  }
}

/**
 * Récupérer un élément de bon de commande par son ID
 */
export const getPurchaseOrderItemById = async (ctx: Context) => {
  try {
    const { id } = ctx.params

    const item = await PurchaseOrderItem.findByPk(id, {
      include: [
        {
          model: Product,
          attributes: ["id", "name", "code", "category", "unitPrice", "taxRate"],
        },
      ],
    })

    if (!item) {
      throw new NotFoundError(`Purchase order item with ID ${id} not found`)
    }

    ctx.body = item
  } catch (error) {
    console.error("Error getting purchase order item:", error)
    throw error
  }
}

/**
 * Mettre à jour la quantité facturée d'un élément de bon de commande
 * Cette fonction est utilisée lors de la création de factures
 */
export const updateInvoicedQuantity = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const { invoicedQuantity } = ctx.request.body as any

    const item = await PurchaseOrderItem.findByPk(id)

    if (!item) {
      throw new NotFoundError(`Purchase order item with ID ${id} not found`)
    }

    // Vérifier que la quantité facturée ne dépasse pas la quantité totale
    if (Number(invoicedQuantity) > Number(item.get("quantity"))) {
      throw new BadRequestError(
        `Invoiced quantity (${invoicedQuantity}) cannot exceed total quantity (${item.get(
          "quantity"
        )})`
      )
    }

    await item.update({
      invoicedQuantity,
    })

    // Si tous les éléments du bon de commande sont entièrement facturés,
    // mettre à jour le statut du bon de commande en conséquence
    await updatePurchaseOrderInvoiceStatus(item.get("purchaseOrderId") as string)

    ctx.body = await PurchaseOrderItem.findByPk(id, {
      include: [
        {
          model: Product,
          attributes: ["id", "name", "code", "category", "unitPrice", "taxRate"],
        },
      ],
    })
  } catch (error) {
    console.error("Error updating invoiced quantity:", error)
    throw error
  }
}

/**
 * Mettre à jour le statut de facturation d'un bon de commande
 * Cette fonction vérifie si tous les éléments sont entièrement facturés ou partiellement facturés
 */
async function updatePurchaseOrderInvoiceStatus(purchaseOrderId: string) {
  const { PurchaseOrder } = require("../models")
  const { PurchaseOrderStatus } = require("../models/purchaseOrder")

  try {
    // Récupérer tous les éléments du bon de commande
    const items = await PurchaseOrderItem.findAll({
      where: {
        purchaseOrderId,
      },
    })

    if (items.length === 0) {
      return
    }

    // Vérifier si tous les éléments sont entièrement facturés
    const allFullyInvoiced = items.every(
      (item) => Number(item.get("invoicedQuantity")) === Number(item.get("quantity"))
    )

    // Vérifier si au moins un élément est partiellement facturé
    const somePartiallyInvoiced = items.some(
      (item) => Number(item.get("invoicedQuantity")) > 0
    )

    // Récupérer le bon de commande
    const purchaseOrder = await PurchaseOrder.findByPk(purchaseOrderId)
    if (!purchaseOrder) {
      return
    }

    // Mettre à jour le statut du bon de commande en fonction de l'état de facturation
    if (allFullyInvoiced) {
      await purchaseOrder.update({
        status: PurchaseOrderStatus.FULLY_INVOICED,
      })
    } else if (somePartiallyInvoiced) {
      await purchaseOrder.update({
        status: PurchaseOrderStatus.PARTIALLY_INVOICED,
      })
    }
  } catch (error) {
    console.error("Error updating purchase order invoice status:", error)
  }
}
