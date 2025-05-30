import { Context } from "koa"
import { Op } from "sequelize"
import { Company, Contact, Opportunity, Product, Quote, QuoteItem, User } from "../models"
import { QuoteStatus } from "../models/quote"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { buildPaginatedResponse, extractPaginationParams } from "../utils/pagination"

/**
 * Récupérer tous les devis avec pagination
 */
export const getAllQuotes = async (ctx: Context) => {
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

    if (ctx.query.opportunityId) {
      filters.opportunityId = ctx.query.opportunityId
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
    const { count, rows: quotes } = await Quote.findAndCountAll({
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
          model: Opportunity,
          attributes: ["id", "name"],
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

    ctx.body = buildPaginatedResponse(quotes, count, { page, limit, offset })
  } catch (error) {
    console.error("Error getting quotes:", error)
    throw error
  }
}

/**
 * Récupérer un devis par son ID
 */
export const getQuoteById = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId

    const quote = await Quote.findOne({
      where: {
        id,
        tenantId,
      },
      include: [
        {
          model: QuoteItem,
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
          model: Opportunity,
          attributes: ["id", "name", "value", "probability"],
        },
        {
          model: User,
          as: "assignedTo",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })

    if (!quote) {
      throw new NotFoundError(`Quote with ID ${id} not found`)
    }

    ctx.body = quote
  } catch (error) {
    console.error("Error getting quote:", error)
    throw error
  }
}

/**
 * Créer un nouveau devis
 */
export const createQuote = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId
    const {
      title,
      description,
      status,
      validUntil,
      discountAmount,
      discountType,
      notes,
      terms,
      opportunityId,
      contactId,
      companyId,
      assignedToId,
      items = [],
    } = ctx.request.body as any

    // Valider les données minimales requises
    if (!title) {
      throw new BadRequestError("Quote title is required")
    }

    // Créer le devis de base
    const quote = await Quote.create({
      title,
      description,
      status: status || QuoteStatus.DRAFT,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      discountAmount,
      discountType,
      notes,
      terms,
      opportunityId,
      contactId,
      companyId,
      assignedToId: assignedToId || ctx.state.user.id,
      tenantId,
      totalAmount: 0, // Sera calculé après l'ajout des éléments
      taxes: 0, // Sera calculé après l'ajout des éléments
    })

    // Ajouter les éléments du devis
    if (items && items.length > 0) {
      const quoteItems = await Promise.all(
        items.map(async (item: any, index: number) => {
          // Si un productId est fourni, récupérer les données du produit
          if (item.productId) {
            const product = await Product.findByPk(item.productId)
            if (product) {
              // Utiliser les données du produit si l'élément n'a pas ses propres valeurs
              item.description = item.description || product.get("description")
              item.unitPrice = item.unitPrice || product.get("unitPrice")
              item.taxRate =
                item.taxRate !== undefined ? item.taxRate : product.get("taxRate")
            }
          }

          return QuoteItem.create({
            ...item,
            position: index,
            quoteId: quote.id,
          })
        })
      )

      // Calculer le total du devis
      const totalBeforeTax = quoteItems.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0
      )
      const totalTaxes = quoteItems.reduce(
        (sum, item) =>
          sum +
          (Number(item.unitPrice) * Number(item.quantity) * Number(item.taxRate || 0)) /
            100,
        0
      )

      // Appliquer la remise globale si nécessaire
      let finalTotal = totalBeforeTax
      if (discountAmount) {
        if (discountType === "PERCENTAGE") {
          finalTotal = totalBeforeTax * (1 - Number(discountAmount) / 100)
        } else {
          finalTotal = totalBeforeTax - Number(discountAmount)
        }
      }

      // Mettre à jour les totaux du devis
      await quote.update({
        totalAmount: finalTotal,
        taxes: totalTaxes,
      })
    }

    // Récupérer le devis complet avec ses éléments
    const completeQuote = await Quote.findByPk(quote.id, {
      include: [
        {
          model: QuoteItem,
          order: [["position", "ASC"]],
          include: [
            {
              model: Product,
              attributes: ["id", "name", "code", "category", "unitPrice", "taxRate"],
            },
          ],
        },
      ],
    })

    ctx.status = 201
    ctx.body = completeQuote
  } catch (error) {
    console.error("Error creating quote:", error)
    throw error
  }
}

/**
 * Mettre à jour un devis
 */
export const updateQuote = async (ctx: Context) => {
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
      notes,
      terms,
      opportunityId,
      contactId,
      companyId,
      assignedToId,
      items = [],
    } = ctx.request.body as any

    // Vérifier si le devis existe
    const quote = await Quote.findOne({
      where: {
        id,
        tenantId,
      },
      include: [
        {
          model: QuoteItem,
        },
      ],
    })

    if (!quote) {
      throw new NotFoundError(`Quote with ID ${id} not found`)
    }

    // Mettre à jour les champs de base du devis
    await quote.update({
      title: title !== undefined ? title : quote.title,
      description: description !== undefined ? description : quote.description,
      status: status || quote.status,
      validUntil: validUntil ? new Date(validUntil) : quote.validUntil,
      discountAmount:
        discountAmount !== undefined ? discountAmount : quote.discountAmount,
      discountType: discountType || quote.discountType,
      notes: notes !== undefined ? notes : quote.notes,
      terms: terms !== undefined ? terms : quote.terms,
      opportunityId: opportunityId !== undefined ? opportunityId : quote.opportunityId,
      contactId: contactId !== undefined ? contactId : quote.contactId,
      companyId: companyId !== undefined ? companyId : quote.companyId,
      assignedToId: assignedToId !== undefined ? assignedToId : quote.assignedToId,
    })

    // Gérer les éléments du devis si fournis
    if (items && items.length > 0) {
      // Supprimer les éléments existants
      await QuoteItem.destroy({
        where: {
          quoteId: id,
        },
      })

      // Créer les nouveaux éléments
      const quoteItems = await Promise.all(
        items.map(async (item: any, index: number) => {
          // Si un productId est fourni, récupérer les données du produit
          if (item.productId) {
            const product = await Product.findByPk(item.productId)
            if (product) {
              // Utiliser les données du produit si l'élément n'a pas ses propres valeurs
              item.description = item.description || product.get("description")
              item.unitPrice = item.unitPrice || product.get("unitPrice")
              item.taxRate =
                item.taxRate !== undefined ? item.taxRate : product.get("taxRate")
            }
          }

          return QuoteItem.create({
            ...item,
            position: index,
            quoteId: quote.id,
          })
        })
      )

      // Calculer le total du devis
      const totalBeforeTax = quoteItems.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0
      )
      const totalTaxes = quoteItems.reduce(
        (sum, item) =>
          sum +
          (Number(item.unitPrice) * Number(item.quantity) * Number(item.taxRate || 0)) /
            100,
        0
      )

      // Appliquer la remise globale si nécessaire
      let finalTotal = totalBeforeTax
      if (quote.discountAmount) {
        if (quote.discountType === "PERCENTAGE") {
          finalTotal = totalBeforeTax * (1 - Number(quote.discountAmount) / 100)
        } else {
          finalTotal = totalBeforeTax - Number(quote.discountAmount)
        }
      }

      // Mettre à jour les totaux du devis
      await quote.update({
        totalAmount: finalTotal,
        taxes: totalTaxes,
      })
    }

    // Récupérer le devis mis à jour
    const updatedQuote = await Quote.findByPk(id, {
      include: [
        {
          model: QuoteItem,
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
          model: Opportunity,
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "assignedTo",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
    })

    ctx.body = updatedQuote
  } catch (error) {
    console.error("Error updating quote:", error)
    throw error
  }
}

/**
 * Supprimer un devis
 */
export const deleteQuote = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId

    // Vérifier si le devis existe
    const quote = await Quote.findOne({
      where: {
        id,
        tenantId,
      },
    })

    if (!quote) {
      throw new NotFoundError(`Quote with ID ${id} not found`)
    }

    // Les éléments du devis seront supprimés automatiquement grâce à onDelete: 'CASCADE'
    await quote.destroy()

    ctx.status = 204 // No Content
  } catch (error) {
    console.error("Error deleting quote:", error)
    throw error
  }
}

/**
 * Changer le statut d'un devis
 */
export const changeQuoteStatus = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId
    const { status } = ctx.request.body as any

    if (!Object.values(QuoteStatus).includes(status)) {
      throw new BadRequestError(`Invalid status: ${status}`)
    }

    const quote = await Quote.findOne({
      where: {
        id,
        tenantId,
      },
    })

    if (!quote) {
      throw new NotFoundError(`Quote with ID ${id} not found`)
    }

    await quote.update({ status })

    ctx.body = { id, status }
  } catch (error) {
    console.error("Error changing quote status:", error)
    throw error
  }
}

/**
 * Dupliquer un devis existant
 */
export const duplicateQuote = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId

    // Récupérer le devis à dupliquer
    const sourceQuote = await Quote.findOne({
      where: {
        id,
        tenantId,
      },
      include: [
        {
          model: QuoteItem,
          order: [["position", "ASC"]],
        },
      ],
    })

    if (!sourceQuote) {
      throw new NotFoundError(`Quote with ID ${id} not found`)
    }

    // Créer un clone du devis sans les ID uniques
    const quoteData = sourceQuote.toJSON()
    delete quoteData.id
    delete quoteData.reference
    quoteData.title = `Copie de ${quoteData.title}`
    quoteData.status = QuoteStatus.DRAFT
    quoteData.createdAt = new Date()
    quoteData.updatedAt = new Date()

    // Créer le nouveau devis
    const newQuote = await Quote.create(quoteData)

    // Dupliquer les éléments du devis
    if (sourceQuote.QuoteItems && sourceQuote.QuoteItems.length > 0) {
      await Promise.all(
        sourceQuote.QuoteItems.map(async (item: any, index: number) => {
          const itemData = item.toJSON()
          delete itemData.id
          delete itemData.quoteId
          itemData.createdAt = new Date()
          itemData.updatedAt = new Date()

          return QuoteItem.create({
            ...itemData,
            position: index,
            quoteId: newQuote.id,
          })
        })
      )
    }

    // Récupérer le devis dupliqué complet
    const duplicatedQuote = await Quote.findByPk(newQuote.id, {
      include: [
        {
          model: QuoteItem,
          order: [["position", "ASC"]],
          include: [
            {
              model: Product,
              attributes: ["id", "name", "code", "category", "unitPrice", "taxRate"],
            },
          ],
        },
      ],
    })

    ctx.status = 201
    ctx.body = duplicatedQuote
  } catch (error) {
    console.error("Error duplicating quote:", error)
    throw error
  }
}
