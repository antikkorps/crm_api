import { Context } from "koa"
import { Op } from "sequelize"
import { Product, QuoteItem } from "../models"
import { BadRequestError, NotFoundError } from "../utils/errors"

/**
 * Récupérer les détails d'un produit pour l'utiliser dans un élément de devis
 */
export const getProductForQuoteItem = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId

    const product = await Product.findOne({
      where: {
        id,
        tenantId,
        isActive: true,
      },
      attributes: [
        "id",
        "name",
        "description",
        "code",
        "category",
        "unitPrice",
        "taxRate",
      ],
    })

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found or inactive`)
    }

    ctx.body = product
  } catch (error) {
    console.error("Error getting product for quote item:", error)
    throw error
  }
}

/**
 * Rechercher des produits par nom ou code pour l'autocomplétion dans les devis
 */
export const searchProductsForQuoteItem = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId
    const { query } = ctx.query

    if (!query || typeof query !== "string") {
      throw new BadRequestError("Search query is required")
    }

    const products = await Product.findAll({
      where: {
        tenantId,
        isActive: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { code: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
        ],
      },
      attributes: [
        "id",
        "name",
        "description",
        "code",
        "category",
        "unitPrice",
        "taxRate",
      ],
      order: [["name", "ASC"]],
      limit: 10,
    })

    ctx.body = products
  } catch (error) {
    console.error("Error searching products for quote item:", error)
    throw error
  }
}

/**
 * Obtenir les statistiques d'utilisation d'un produit dans les devis
 */
export const getProductUsageStats = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId

    const product = await Product.findOne({
      where: {
        id,
        tenantId,
      },
    })

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`)
    }

    // Compter le nombre de fois où ce produit a été utilisé dans des devis
    const quoteItemsCount = await QuoteItem.count({
      where: {
        productId: id,
      },
    })

    // Récupérer les 5 derniers devis utilisant ce produit
    const recentQuoteItems = await QuoteItem.findAll({
      where: {
        productId: id,
      },
      include: [
        {
          model: Product,
          attributes: ["id", "name", "code"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 5,
    })

    ctx.body = {
      usageCount: quoteItemsCount,
      recentUsage: recentQuoteItems,
    }
  } catch (error) {
    console.error("Error getting product usage stats:", error)
    throw error
  }
}
