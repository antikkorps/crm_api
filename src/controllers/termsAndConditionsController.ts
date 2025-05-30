import { Context } from "koa"
import { Op } from "sequelize"
import { sequelize, TermsAndConditions } from "../models"
import { buildPaginatedResponse, extractPaginationParams } from "../utils/pagination"

/**
 * Récupérer toutes les conditions générales de vente
 */
export const getAllTermsAndConditions = async (ctx: Context) => {
  try {
    const { tenantId } = ctx.state.user
    const paginationParams = extractPaginationParams(ctx)

    const { count, rows } = await TermsAndConditions.findAndCountAll({
      where: { tenantId },
      limit: paginationParams.limit,
      offset: paginationParams.offset,
      order: [["createdAt", "DESC"]],
    })

    ctx.body = buildPaginatedResponse(rows, count, paginationParams)
  } catch (error: any) {
    ctx.status = 500
    ctx.body = {
      success: false,
      message: "Erreur lors de la récupération des conditions générales de vente",
      error: error.message,
    }
  }
}

/**
 * Récupérer les conditions générales de vente par ID
 */
export const getTermsAndConditionsById = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const { tenantId } = ctx.state.user

    const terms = await TermsAndConditions.findOne({
      where: { id, tenantId },
    })

    if (!terms) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: "Conditions générales de vente non trouvées",
      }
      return
    }

    ctx.body = { success: true, terms }
  } catch (error: any) {
    ctx.status = 500
    ctx.body = {
      success: false,
      message: "Erreur lors de la récupération des conditions générales de vente",
      error: error.message,
    }
  }
}

/**
 * Créer de nouvelles conditions générales de vente
 */
export const createTermsAndConditions = async (ctx: Context) => {
  try {
    const { tenantId } = ctx.state.user
    const { title, content, isDefault = false } = ctx.request.body as any

    // Vérifier les données minimales requises
    if (!title || !content) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: "Le titre et le contenu sont requis",
      }
      return
    }

    // Si ces conditions sont définies comme par défaut, mettre à jour les autres
    if (isDefault) {
      await TermsAndConditions.update(
        { isDefault: false },
        { where: { tenantId, isDefault: true } }
      )
    }

    // Créer les nouvelles conditions
    const terms = await TermsAndConditions.create({
      title,
      content,
      isDefault,
      tenantId,
    })

    ctx.status = 201
    ctx.body = { success: true, terms }
  } catch (error: any) {
    ctx.status = 500
    ctx.body = {
      success: false,
      message: "Erreur lors de la création des conditions générales de vente",
      error: error.message,
    }
  }
}

/**
 * Mettre à jour des conditions générales de vente
 */
export const updateTermsAndConditions = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const { tenantId } = ctx.state.user
    const { title, content, isDefault } = ctx.request.body as any

    // Vérifier que les conditions existent
    const terms = await TermsAndConditions.findOne({
      where: { id, tenantId },
    })

    if (!terms) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: "Conditions générales de vente non trouvées",
      }
      return
    }

    // Si ces conditions sont définies comme par défaut, mettre à jour les autres
    if (isDefault) {
      await TermsAndConditions.update(
        { isDefault: false },
        { where: { tenantId, isDefault: true, id: { [Op.ne]: id } } }
      )
    }

    // Mettre à jour les conditions
    await terms.update({ title, content, isDefault })

    ctx.body = { success: true, terms }
  } catch (error: any) {
    ctx.status = 500
    ctx.body = {
      success: false,
      message: "Erreur lors de la mise à jour des conditions générales de vente",
      error: error.message,
    }
  }
}

/**
 * Supprimer des conditions générales de vente
 */
export const deleteTermsAndConditions = async (ctx: Context) => {
  try {
    const { id } = ctx.params
    const { tenantId } = ctx.state.user

    // Vérifier que les conditions existent
    const terms = await TermsAndConditions.findOne({
      where: { id, tenantId },
    })

    if (!terms) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: "Conditions générales de vente non trouvées",
      }
      return
    }

    // Vérifier si les conditions sont actuellement utilisées par des devis
    const Quote = sequelize.models.Quote
    const quotesUsingTerms = await Quote.count({
      where: { termsAndConditionsId: id, tenantId },
    })

    if (quotesUsingTerms > 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message:
          "Impossible de supprimer ces conditions générales car elles sont utilisées par des devis existants",
      }
      return
    }

    // Supprimer les conditions
    await terms.destroy()

    ctx.body = {
      success: true,
      message: "Conditions générales de vente supprimées avec succès",
    }
  } catch (error: any) {
    ctx.status = 500
    ctx.body = {
      success: false,
      message: "Erreur lors de la suppression des conditions générales de vente",
      error: error.message,
    }
  }
}

/**
 * Récupérer les conditions générales de vente par défaut
 */
export const getDefaultTermsAndConditions = async (ctx: Context) => {
  try {
    const { tenantId } = ctx.state.user

    const terms = await TermsAndConditions.findOne({
      where: { tenantId, isDefault: true },
    })

    if (!terms) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: "Aucunes conditions générales de vente par défaut trouvées",
      }
      return
    }

    ctx.body = { success: true, terms }
  } catch (error: any) {
    ctx.status = 500
    ctx.body = {
      success: false,
      message:
        "Erreur lors de la récupération des conditions générales de vente par défaut",
      error: error.message,
    }
  }
}
