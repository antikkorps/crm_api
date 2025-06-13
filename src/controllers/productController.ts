import { Context } from "koa"
import { Op } from "sequelize"
import { Product, User } from "../models"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { buildPaginatedResponse, extractPaginationParams } from "../utils/pagination"

/**
 * Récupérer tous les produits avec pagination et filtres
 */
export const getAllProducts = async (ctx: Context) => {
  try {
    const { page, limit, offset } = extractPaginationParams(ctx)
    const tenantId = ctx.state.user.tenantId

    const filters: any = { tenantId }

    // Filtres optionnels
    if (ctx.query.category) {
      filters.category = ctx.query.category
    }

    if (ctx.query.isActive !== undefined) {
      filters.isActive = ctx.query.isActive === "true"
    }

    if (ctx.query.search) {
      filters[Op.or] = [
        { name: { [Op.iLike]: `%${ctx.query.search}%` } },
        { description: { [Op.iLike]: `%${ctx.query.search}%` } },
        { code: { [Op.iLike]: `%${ctx.query.search}%` } },
      ]
    }

    // Récupérer les produits avec filtres et pagination
    const { count, rows: products } = await Product.findAndCountAll({
      where: filters,
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
      order: ctx.query.sortBy
        ? [
            [
              ctx.query.sortBy as string,
              Array.isArray(ctx.query.sortOrder)
                ? ctx.query.sortOrder[0] || "ASC"
                : ctx.query.sortOrder || "ASC",
            ],
          ]
        : [["createdAt", "DESC"]],
      offset,
      limit,
    })

    ctx.body = buildPaginatedResponse(products, count, { page, limit, offset })
  } catch (error) {
    console.error("Error getting products:", error)
    throw error
  }
}

/**
 * Récupérer les catégories de produits uniques
 */
export const getProductCategories = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId

    const categories = await Product.findAll({
      attributes: ["category"],
      where: {
        tenantId,
        category: {
          [Op.not]: null,
        },
      },
      group: ["category"],
      raw: true,
    })

    ctx.body = categories.map((item) => item.category).filter(Boolean)
  } catch (error) {
    console.error("Error getting product categories:", error)
    throw error
  }
}

/**
 * Récupérer un produit par son ID
 */
export const getProductById = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId

    const product = await Product.findOne({
      where: {
        id,
        tenantId,
      },
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`)
    }

    ctx.body = product
  } catch (error) {
    console.error("Error getting product:", error)
    throw error
  }
}

/**
 * Créer un nouveau produit
 */
export const createProduct = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId
    const userId = ctx.state.user.id
    const {
      name,
      description,
      code,
      category,
      unitPrice,
      taxRate,
      isActive = true,
    } = ctx.request.body as any

    // Valider les données minimales requises
    if (!name || !description) {
      throw new BadRequestError("Product name and description are required")
    }

    if (unitPrice === undefined || unitPrice === null) {
      throw new BadRequestError("Unit price is required")
    }

    // Vérifier si un produit avec le même code existe déjà
    if (code) {
      const existingProduct = await Product.findOne({
        where: {
          code,
          tenantId,
        },
      })

      if (existingProduct) {
        throw new BadRequestError(`A product with code ${code} already exists`)
      }
    }

    // Créer le produit
    const product = await Product.create({
      name,
      description,
      code,
      category,
      unitPrice,
      taxRate: taxRate !== undefined ? taxRate : 20.0, // TVA standard par défaut
      isActive,
      tenantId,
      createdById: userId,
    })

    ctx.status = 201
    ctx.body = product
  } catch (error) {
    console.error("Error creating product:", error)
    throw error
  }
}

/**
 * Mettre à jour un produit existant
 */
export const updateProduct = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId
    const { name, description, code, category, unitPrice, taxRate, isActive } = ctx
      .request.body as any

    // Vérifier si le produit existe
    const product = await Product.findOne({
      where: {
        id,
        tenantId,
      },
    })

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`)
    }

    // Vérifier si le nouveau code existe déjà (si modifié)
    if (code && code !== product.get("code")) {
      const existingProduct = await Product.findOne({
        where: {
          code,
          tenantId,
          id: { [Op.ne]: id },
        },
      })

      if (existingProduct) {
        throw new BadRequestError(`A product with code ${code} already exists`)
      }
    }

    // Mettre à jour le produit
    await product.update({
      name: name !== undefined ? name : product.get("name"),
      description: description !== undefined ? description : product.get("description"),
      code: code !== undefined ? code : product.get("code"),
      category: category !== undefined ? category : product.get("category"),
      unitPrice: unitPrice !== undefined ? unitPrice : product.get("unitPrice"),
      taxRate: taxRate !== undefined ? taxRate : product.get("taxRate"),
      isActive: isActive !== undefined ? isActive : product.get("isActive"),
    })

    // Récupérer le produit mis à jour
    const updatedProduct = await Product.findByPk(id, {
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
    })

    ctx.body = updatedProduct
  } catch (error) {
    console.error("Error updating product:", error)
    throw error
  }
}

/**
 * Supprimer un produit
 */
export const deleteProduct = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId

    // Vérifier si le produit existe
    const product = await Product.findOne({
      where: {
        id,
        tenantId,
      },
    })

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`)
    }

    // Supprimer le produit
    await product.destroy()

    ctx.status = 204 // No Content
  } catch (error) {
    console.error("Error deleting product:", error)
    throw error
  }
}

/**
 * Activer ou désactiver un produit
 */
export const toggleProductStatus = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const tenantId = ctx.state.user.tenantId
    const { isActive } = ctx.request.body as any

    if (isActive === undefined) {
      throw new BadRequestError("isActive field is required")
    }

    const product = await Product.findOne({
      where: {
        id,
        tenantId,
      },
    })

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`)
    }

    await product.update({ isActive })

    ctx.body = { id, isActive }
  } catch (error) {
    console.error("Error toggling product status:", error)
    throw error
  }
}
