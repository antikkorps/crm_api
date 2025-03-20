import { Context } from "koa"
import { FindOptions, Model } from "sequelize"

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    totalItems: number
    totalPages: number
    currentPage: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

/**
 * Extrait les paramètres de pagination d'une requête
 * @param ctx Le contexte Koa
 * @param defaultLimit Limite par défaut si non spécifiée
 * @returns Les paramètres de pagination
 */
export const extractPaginationParams = (
  ctx: Context,
  defaultLimit: number = 10
): PaginationParams => {
  const page = Math.max(1, parseInt(ctx.query.page as string) || 1)
  const limit = Math.max(
    1,
    Math.min(100, parseInt(ctx.query.limit as string) || defaultLimit)
  )
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Construit et renvoie une réponse paginée
 * @param items Les éléments pour la page courante
 * @param total Le nombre total d'éléments
 * @param params Les paramètres de pagination utilisés
 * @returns Un objet contenant les éléments et les métadonnées de pagination
 */
export const buildPaginatedResponse = <T>(
  items: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(total / params.limit)

  return {
    items,
    pagination: {
      totalItems: total,
      totalPages,
      currentPage: params.page,
      itemsPerPage: params.limit,
      hasNextPage: params.page < totalPages,
      hasPreviousPage: params.page > 1,
    },
  }
}

/**
 * Exécute une requête avec pagination et renvoie une réponse formatée
 * @param model Le modèle Sequelize à utiliser
 * @param ctx Le contexte Koa
 * @param findOptions Les options de requête Sequelize
 * @param defaultLimit Limite par défaut si non spécifiée
 * @returns Un objet contenant les éléments et les métadonnées de pagination
 */
export const paginatedQuery = async <T extends Model>(
  model: any,
  ctx: Context,
  findOptions: FindOptions = {},
  defaultLimit: number = 10
): Promise<PaginatedResponse<T>> => {
  const params = extractPaginationParams(ctx, defaultLimit)

  // Ajouter les paramètres de pagination aux options de requête
  const options = {
    ...findOptions,
    limit: params.limit,
    offset: params.offset,
  }

  // Exécuter la requête avec pagination
  const { rows, count } = await model.findAndCountAll(options)

  // Construire la réponse paginée
  return buildPaginatedResponse<T>(rows as T[], count, params)
}
