import { Context } from "koa"
import { Op } from "sequelize"
import {
  Company,
  Contact,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  Quote,
  sequelize,
  TermsAndConditions,
  User,
} from "../models"
import { PurchaseOrderStatus } from "../models/purchaseOrder"
import { QuoteStatus } from "../models/quote"
import { calculateQuoteTotals } from "../services/quoteCalculationService"
import quoteConversionService from "../services/quoteConversionService"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { buildPaginatedResponse, extractPaginationParams } from "../utils/pagination"

/**
 * Générer une référence unique pour un bon de commande
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

/**
 * Récupérer tous les bons de commande avec pagination
 */
export const getAllPurchaseOrders = async (ctx: Context) => {
  try {
    const { page, limit, offset } = extractPaginationParams(ctx)
    const tenantId = ctx.state.user.tenantId

    const filters: any = { tenantId }

    // Filtres optionnels
    if (ctx.query.status) {
      filters.status = ctx.query.status
    }

    if (ctx.query.contactId) {
      filters.contactId = ctx.query.contactId
    }

    if (ctx.query.companyId) {
      filters.companyId = ctx.query.companyId
    }

    if (ctx.query.quoteId) {
      filters.quoteId = ctx.query.quoteId
    }

    if (ctx.query.assignedToId) {
      filters.assignedToId = ctx.query.assignedToId
    }

    if (ctx.query.search) {
      filters[Op.or] = [
        { title: { [Op.iLike]: `%${ctx.query.search}%` } },
        { reference: { [Op.iLike]: `%${ctx.query.search}%` } },
      ]
    }

    // Rassembler les résultats
    const { count, rows: purchaseOrders } = await PurchaseOrder.findAndCountAll({
      where: filters,
      include: [
        {
          model: Contact,
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Company,
          attributes: ["id", "name"],
        },
        {
          model: Quote,
          attributes: ["id", "reference", "title"],
        },
        {
          model: User,
          as: "assignedTo",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit,
    })

    ctx.body = buildPaginatedResponse(purchaseOrders, count, { page, limit, offset })
  } catch (error) {
    console.error("Error getting purchase orders:", error)
    throw error
  }
}

/**
 * Récupérer un bon de commande par son ID
 */
export const getPurchaseOrderById = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId

    const purchaseOrder = await PurchaseOrder.findOne({
      where: {
        id,
        tenantId,
      },
      include: [
        {
          model: PurchaseOrderItem,
          order: [["position", "ASC"]],
          include: [
            {
              model: Product,
              attributes: ["id", "name", "code", "category", "unitPrice", "taxRate"],
            },
          ],
        },
        {
          model: Contact,
          attributes: ["id", "firstName", "lastName", "email", "phone", "address"],
        },
        {
          model: Company,
          attributes: [
            "id",
            "name",
            "website",
            "address",
            "city",
            "postalCode",
            "country",
          ],
        },
        {
          model: Quote,
          attributes: ["id", "reference", "title"],
        },
        {
          model: User,
          as: "assignedTo",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: TermsAndConditions,
          attributes: ["id", "title", "content"],
        },
      ],
    })

    if (!purchaseOrder) {
      throw new NotFoundError(`Purchase order with ID ${id} not found`)
    }

    ctx.body = purchaseOrder
  } catch (error) {
    console.error("Error getting purchase order:", error)
    throw error
  }
}

/**
 * Créer un nouveau bon de commande
 */
export const createPurchaseOrder = async (ctx: Context) => {
  // Utiliser une transaction pour garantir l'atomicité des opérations
  const transaction = await sequelize.transaction()

  try {
    const tenantId = ctx.state.user.tenantId
    const userId = ctx.state.user.id
    const {
      title,
      description,
      status,
      validUntil,
      discountAmount,
      discountType,
      taxRate,
      notes,
      terms,
      quoteId,
      contactId,
      companyId,
      assignedToId,
      clientReference,
      termsAndConditionsId,
      items = [],
    } = ctx.request.body as any

    // Valider les données minimales requises
    if (!title) {
      throw new BadRequestError("Purchase order title is required")
    }

    if (!companyId) {
      throw new BadRequestError("Company ID is required")
    }

    // Créer le bon de commande de base
    const purchaseOrder = await PurchaseOrder.create(
      {
        reference: generatePurchaseOrderReference(),
        title,
        description,
        status: status || PurchaseOrderStatus.DRAFT,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        discountAmount,
        discountType,
        taxRate,
        notes,
        terms,
        quoteId,
        contactId,
        companyId,
        assignedToId: assignedToId || userId,
        clientReference,
        termsAndConditionsId,
        tenantId,
        totalAmount: 0, // Sera calculé après l'ajout des éléments
        taxes: 0, // Sera calculé après l'ajout des éléments
      },
      { transaction }
    )

    // Ajouter les éléments du bon de commande
    const purchaseOrderItems = []
    if (items && items.length > 0) {
      for (let index = 0; index < items.length; index++) {
        const item = items[index]
        // Si un productId est fourni, récupérer les données du produit
        if (item.productId) {
          const product = await Product.findByPk(item.productId, { transaction })
          if (product) {
            // Utiliser les données du produit si l'élément n'a pas ses propres valeurs
            item.description = item.description || product.get("description")
            item.unitPrice =
              item.unitPrice !== undefined ? item.unitPrice : product.get("unitPrice")
            item.taxRate =
              item.taxRate !== undefined ? item.taxRate : product.get("taxRate")
          }
        }

        const poItem = await PurchaseOrderItem.create(
          {
            ...item,
            quoteItemId: item.quoteItemId || null,
            position: index,
            purchaseOrderId: purchaseOrder.id,
            invoicedQuantity: 0, // Par défaut, aucune quantité n'est facturée
          },
          { transaction }
        )

        purchaseOrderItems.push(poItem)
      }

      // Utiliser le service de calcul pour obtenir les totaux
      const calculatedTotals = calculateQuoteTotals(
        purchaseOrderItems,
        discountAmount,
        discountType,
        taxRate
      )

      // Mettre à jour les totaux du bon de commande
      await purchaseOrder.update(
        {
          totalAmount: calculatedTotals.totalAmount,
          taxes: calculatedTotals.taxAmount,
        },
        { transaction }
      )
    }

    // Récupérer le bon de commande complet avec ses éléments
    const completePurchaseOrder = await PurchaseOrder.findByPk(purchaseOrder.id, {
      include: [
        {
          model: PurchaseOrderItem,
          order: [["position", "ASC"]],
          include: [
            {
              model: Product,
              attributes: ["id", "name", "code", "category", "unitPrice", "taxRate"],
            },
          ],
        },
      ],
      transaction,
    })

    // Valider la transaction
    await transaction.commit()

    ctx.status = 201
    ctx.body = completePurchaseOrder
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await transaction.rollback()
    console.error("Error creating purchase order:", error)
    throw error
  }
}

/**
 * Convertir un devis en bon de commande
 */
export const convertQuoteToPurchaseOrder = async (ctx: Context) => {
  // Utiliser une transaction pour garantir l'atomicité des opérations
  const transaction = await sequelize.transaction()

  try {
    const { quoteId } = ctx.params
    const tenantId = ctx.state.user.tenantId
    const userId = ctx.state.user.id

    // Utiliser notre service de conversion
    const purchaseOrder = await quoteConversionService.convertQuoteToPurchaseOrder(
      quoteId,
      userId,
      tenantId,
      transaction
    )

    // Récupérer le bon de commande complet avec ses éléments
    const completePurchaseOrder = await PurchaseOrder.findByPk(purchaseOrder.id, {
      include: [
        {
          model: PurchaseOrderItem,
          order: [["position", "ASC"]],
          include: [
            {
              model: Product,
              attributes: ["id", "name", "code", "category", "unitPrice", "taxRate"],
            },
          ],
        },
      ],
      transaction,
    })

    // Valider la transaction
    await transaction.commit()

    ctx.status = 201
    ctx.body = completePurchaseOrder
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await transaction.rollback()
    console.error("Error converting quote to purchase order:", error)
    throw error
  }
}

/**
 * Mettre à jour un bon de commande
 */
export const updatePurchaseOrder = async (ctx: Context) => {
  // Utiliser une transaction pour garantir l'atomicité des opérations
  const transaction = await sequelize.transaction()

  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId
    const {
      title,
      description,
      status,
      validUntil,
      discountAmount,
      discountType,
      taxRate,
      notes,
      terms,
      contactId,
      companyId,
      assignedToId,
      clientReference,
      termsAndConditionsId,
      items = [],
    } = ctx.request.body as any

    // Vérifier si le bon de commande existe
    const purchaseOrder = await PurchaseOrder.findOne({
      where: {
        id,
        tenantId,
      },
      include: [
        {
          model: PurchaseOrderItem,
        },
      ],
      transaction,
    })

    if (!purchaseOrder) {
      throw new NotFoundError(`Purchase order with ID ${id} not found`)
    }

    // Mettre à jour les champs de base du bon de commande
    await purchaseOrder.update(
      {
        title: title !== undefined ? title : purchaseOrder.title,
        description: description !== undefined ? description : purchaseOrder.description,
        status: status || purchaseOrder.status,
        validUntil: validUntil ? new Date(validUntil) : purchaseOrder.validUntil,
        discountAmount:
          discountAmount !== undefined ? discountAmount : purchaseOrder.discountAmount,
        discountType: discountType || purchaseOrder.discountType,
        taxRate: taxRate !== undefined ? taxRate : purchaseOrder.taxRate,
        notes: notes !== undefined ? notes : purchaseOrder.notes,
        terms: terms !== undefined ? terms : purchaseOrder.terms,
        contactId: contactId !== undefined ? contactId : purchaseOrder.contactId,
        companyId: companyId !== undefined ? companyId : purchaseOrder.companyId,
        assignedToId:
          assignedToId !== undefined ? assignedToId : purchaseOrder.assignedToId,
        clientReference:
          clientReference !== undefined ? clientReference : purchaseOrder.clientReference,
        termsAndConditionsId:
          termsAndConditionsId !== undefined
            ? termsAndConditionsId
            : purchaseOrder.termsAndConditionsId,
      },
      { transaction }
    )

    // Gérer les éléments du bon de commande si fournis
    const purchaseOrderItems = []
    if (items && items.length > 0) {
      // Supprimer les éléments existants
      await PurchaseOrderItem.destroy({
        where: {
          purchaseOrderId: id,
        },
        transaction,
      })

      // Créer les nouveaux éléments
      for (let index = 0; index < items.length; index++) {
        const item = items[index]
        // Si un productId est fourni, récupérer les données du produit
        if (item.productId) {
          const product = await Product.findByPk(item.productId, { transaction })
          if (product) {
            // Utiliser les données du produit si l'élément n'a pas ses propres valeurs
            item.description = item.description || product.get("description")
            item.unitPrice =
              item.unitPrice !== undefined ? item.unitPrice : product.get("unitPrice")
            item.taxRate =
              item.taxRate !== undefined ? item.taxRate : product.get("taxRate")
          }
        }

        const poItem = await PurchaseOrderItem.create(
          {
            ...item,
            position: index,
            purchaseOrderId: purchaseOrder.id,
            invoicedQuantity: item.invoicedQuantity || 0,
          },
          { transaction }
        )

        purchaseOrderItems.push(poItem)
      }

      // Utiliser le service de calcul pour obtenir les totaux
      const calculatedTotals = calculateQuoteTotals(
        purchaseOrderItems,
        purchaseOrder.discountAmount,
        purchaseOrder.discountType,
        purchaseOrder.taxRate
      )

      // Mettre à jour les totaux du bon de commande
      await purchaseOrder.update(
        {
          totalAmount: calculatedTotals.totalAmount,
          taxes: calculatedTotals.taxAmount,
        },
        { transaction }
      )
    }

    // Récupérer le bon de commande mis à jour
    const updatedPurchaseOrder = await PurchaseOrder.findByPk(id, {
      include: [
        {
          model: PurchaseOrderItem,
          order: [["position", "ASC"]],
          include: [
            {
              model: Product,
              attributes: ["id", "name", "code", "category", "unitPrice", "taxRate"],
            },
          ],
        },
        {
          model: Contact,
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Company,
          attributes: ["id", "name"],
        },
        {
          model: Quote,
          attributes: ["id", "reference", "title"],
        },
        {
          model: User,
          as: "assignedTo",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
      transaction,
    })

    // Valider la transaction
    await transaction.commit()

    ctx.body = updatedPurchaseOrder
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await transaction.rollback()
    console.error("Error updating purchase order:", error)
    throw error
  }
}

/**
 * Supprimer un bon de commande
 */
export const deletePurchaseOrder = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId

    // Vérifier si le bon de commande existe
    const purchaseOrder = await PurchaseOrder.findOne({
      where: {
        id,
        tenantId,
      },
    })

    if (!purchaseOrder) {
      throw new NotFoundError(`Purchase order with ID ${id} not found`)
    }

    // Vérifier si le bon de commande a été converti en facture
    if (
      purchaseOrder.status === PurchaseOrderStatus.PARTIALLY_INVOICED ||
      purchaseOrder.status === PurchaseOrderStatus.FULLY_INVOICED
    ) {
      throw new BadRequestError(
        `Cannot delete purchase order with ID ${id} because it has already been invoiced`
      )
    }

    // Si le bon de commande vient d'un devis, remettre le devis en état ACCEPTED
    if (purchaseOrder.quoteId) {
      const quote = await Quote.findByPk(purchaseOrder.quoteId)
      if (
        quote &&
        quote.status === QuoteStatus.CONVERTED &&
        quote.convertedToId === purchaseOrder.id
      ) {
        await quote.update({
          status: QuoteStatus.ACCEPTED,
          convertedToId: null,
          convertedToType: null,
        })
      }
    }

    // Les éléments du bon de commande seront supprimés automatiquement grâce à onDelete: 'CASCADE'
    await purchaseOrder.destroy()

    ctx.status = 204 // No Content
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    throw error
  }
}

/**
 * Changer le statut d'un bon de commande
 */
export const changePurchaseOrderStatus = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId
    const { status } = ctx.request.body as any

    if (!Object.values(PurchaseOrderStatus).includes(status)) {
      throw new BadRequestError(`Invalid status: ${status}`)
    }

    const purchaseOrder = await PurchaseOrder.findOne({
      where: {
        id,
        tenantId,
      },
    })

    if (!purchaseOrder) {
      throw new NotFoundError(`Purchase order with ID ${id} not found`)
    }

    // Vérifier les transitions d'état valides
    if (
      purchaseOrder.status === PurchaseOrderStatus.PARTIALLY_INVOICED &&
      status !== PurchaseOrderStatus.FULLY_INVOICED &&
      status !== PurchaseOrderStatus.CANCELLED
    ) {
      throw new BadRequestError(
        `Cannot change status from PARTIALLY_INVOICED to ${status}`
      )
    }

    if (
      purchaseOrder.status === PurchaseOrderStatus.FULLY_INVOICED &&
      status !== PurchaseOrderStatus.CANCELLED
    ) {
      throw new BadRequestError(`Cannot change status from FULLY_INVOICED to ${status}`)
    }

    await purchaseOrder.update({ status })

    ctx.body = { id, status }
  } catch (error) {
    console.error("Error changing purchase order status:", error)
    throw error
  }
}
