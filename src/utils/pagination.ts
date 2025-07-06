import { Context } from "koa"
import { FindOptions, Includeable, Model } from "sequelize"

export interface PaginationParams {
  page: number
  limit: number
  offset: number
  disabled?: boolean
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
  // Vérifier si la pagination est explicitement désactivée
  const requestedLimit = parseInt(ctx.query.limit as string)

  if (requestedLimit === -1) {
    return {
      page: 1,
      limit: 0, // Utiliser 0 au lieu de null pour Sequelize
      offset: 0,
      disabled: true,
    }
  }
  // Pagination par défaut
  const page = Math.max(1, parseInt(ctx.query.page as string) || 1)
  const limit = Math.max(
    1,
    Math.min(100, parseInt(ctx.query.limit as string) || defaultLimit)
  )
  const offset = (page - 1) * limit

  return { page, limit, offset, disabled: false }
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
 * Cette fonction traite automatiquement les inclusions d'utilisateurs pour exclure les mots de passe
 */
export const paginatedQuery = async <T extends Model>(
  model: any,
  ctx: Context,
  findOptions: FindOptions = {},
  defaultLimit: number = 10
): Promise<PaginatedResponse<T>> => {
  const params = extractPaginationParams(ctx, defaultLimit)

  // Traiter les inclusions pour exclure les mots de passe des utilisateurs
  if (findOptions.include) {
    const processIncludes = (includes: Includeable | Includeable[]) => {
      if (Array.isArray(includes)) {
        includes.forEach((include) => {
          // Si c'est une inclusion User, ajoutez l'exclusion du mot de passe
          if (typeof include === "object" && include !== null && "model" in include) {
            const modelInclude = include as { model: any; as?: string; attributes?: any }
            if (
              modelInclude.model.name === "User" &&
              (!modelInclude.attributes || !modelInclude.attributes.exclude)
            ) {
              modelInclude.attributes = modelInclude.attributes || {}
              modelInclude.attributes.exclude = [
                ...(modelInclude.attributes.exclude || []),
                "password",
              ]
            }

            // Traitement récursif des sous-inclusions
            if ("include" in modelInclude && modelInclude.include) {
              processIncludes(modelInclude.include)
            }
          }
        })
      } else if (
        typeof includes === "object" &&
        includes !== null &&
        "model" in includes
      ) {
        const modelInclude = includes as { model: any; as?: string; attributes?: any }
        if (
          modelInclude.model.name === "User" &&
          (!modelInclude.attributes || !modelInclude.attributes.exclude)
        ) {
          modelInclude.attributes = modelInclude.attributes || {}
          modelInclude.attributes.exclude = [
            ...(modelInclude.attributes.exclude || []),
            "password",
          ]
        }
      }
    }

    processIncludes(findOptions.include)
  }

  // Ajouter les paramètres de pagination aux options de requête
  const options = {
    ...findOptions,
  }

  if (!params.disabled) {
    options.limit = params.limit
    options.offset = params.offset
  } else {
    // Pour désactiver la pagination, ne pas inclure limit et offset
    // Sequelize retournera tous les résultats
    delete options.limit
    delete options.offset
  }

  // Exécuter la requête avec pagination
  const { rows, count } = await model.findAndCountAll(options)

  if (params.disabled) {
    return {
      items: rows as T[],
      pagination: {
        totalItems: count,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: count,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    }
  }

  // Construire la réponse paginée
  return buildPaginatedResponse<T>(rows as T[], count, params)
}
