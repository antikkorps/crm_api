import { Context, Next } from "koa"
import { ApiError } from "../utils/errors"

/**
 * Types d'erreurs Sequelize
 */
enum SequelizeErrorTypes {
  ValidationError = "SequelizeValidationError",
  UniqueConstraintError = "SequelizeUniqueConstraintError",
  ForeignKeyConstraintError = "SequelizeForeignKeyConstraintError",
  ExclusionConstraintError = "SequelizeExclusionConstraintError",
  DatabaseError = "SequelizeDatabaseError",
}

/**
 * Interface pour le format standardisé des erreurs
 */
interface ErrorResponse {
  success: boolean
  error: {
    message: string
    code: string
    statusCode: number
    details?: any
  }
  timestamp: string
  path: string
}

// Interface pour les erreurs Sequelize
interface SequelizeError {
  name: string
  errors?: Array<{
    path: string
    message: string
  }>
  fields?: string[]
  original?: any
}

/**
 * Middleware de gestion d'erreurs centralisé
 */
export async function errorMiddleware(ctx: Context, next: Next): Promise<void> {
  try {
    await next()

    // Gérer les 404 si une route n'a pas été trouvée
    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404
      ctx.body = formatErrorResponse(ctx, "Not found", "ROUTE_NOT_FOUND", 404, {
        path: ctx.path,
      })
    }
  } catch (err: any) {
    console.error("Error caught by middleware:", err)

    // Déterminer le type d'erreur et formater la réponse
    if (err instanceof ApiError) {
      // Erreurs personnalisées de notre API
      handleApiError(ctx, err)
    } else if (err.name && Object.values(SequelizeErrorTypes).includes(err.name)) {
      // Erreurs Sequelize
      handleSequelizeError(ctx, err as SequelizeError)
    } else if (err.statusCode || err.status) {
      // Erreurs avec un code de statut (comme celles de Koa)
      handleStatusError(ctx, err)
    } else {
      // Erreurs inconnues
      handleUnknownError(ctx, err)
    }

    // Journalisation de l'erreur en production
    if (process.env.NODE_ENV === "production" && ctx.status >= 500) {
      // Ici, vous pourriez utiliser un service de journalisation externe
      console.error(
        "PRODUCTION ERROR:",
        JSON.stringify({
          error: err.message,
          stack: err.stack,
          context: {
            url: ctx.url,
            method: ctx.method,
            ip: ctx.ip,
            userAgent: ctx.headers["user-agent"],
            userId: ctx.state.user?.id,
          },
        })
      )
    }
  }
}

/**
 * Gère les erreurs API personnalisées
 */
function handleApiError(ctx: Context, err: ApiError): void {
  ctx.status = err.statusCode
  ctx.body = formatErrorResponse(
    ctx,
    err.message,
    err.errorCode,
    err.statusCode,
    err.details
  )
}

/**
 * Gère les erreurs Sequelize
 */
function handleSequelizeError(ctx: Context, err: SequelizeError): void {
  switch (err.name) {
    case SequelizeErrorTypes.ValidationError:
      ctx.status = 422
      ctx.body = formatErrorResponse(
        ctx,
        "Validation failed",
        "VALIDATION_ERROR",
        422,
        formatSequelizeValidationError(err)
      )
      break

    case SequelizeErrorTypes.UniqueConstraintError:
      ctx.status = 409
      ctx.body = formatErrorResponse(
        ctx,
        "Resource already exists",
        "UNIQUE_CONSTRAINT_ERROR",
        409,
        formatSequelizeValidationError(err)
      )
      break

    case SequelizeErrorTypes.ForeignKeyConstraintError:
      ctx.status = 400
      ctx.body = formatErrorResponse(
        ctx,
        "Foreign key constraint violation",
        "FOREIGN_KEY_CONSTRAINT_ERROR",
        400,
        { field: err.fields }
      )
      break

    default:
      ctx.status = 500
      ctx.body = formatErrorResponse(
        ctx,
        "Database error",
        "DATABASE_ERROR",
        500,
        process.env.NODE_ENV === "development" ? { original: err.original } : undefined
      )
  }
}

/**
 * Gère les erreurs avec un code de statut
 */
function handleStatusError(ctx: Context, err: any): void {
  const statusCode = err.statusCode || err.status || 500
  ctx.status = statusCode
  ctx.body = formatErrorResponse(
    ctx,
    err.message || "Error",
    err.code || `STATUS_${statusCode}`,
    statusCode,
    process.env.NODE_ENV === "development" ? err : undefined
  )
}

/**
 * Gère les erreurs inconnues
 */
function handleUnknownError(ctx: Context, err: any): void {
  ctx.status = 500
  ctx.body = formatErrorResponse(
    ctx,
    "Internal server error",
    "INTERNAL_SERVER_ERROR",
    500,
    process.env.NODE_ENV === "development"
      ? { error: err.message, stack: err.stack }
      : undefined
  )
}

/**
 * Format les erreurs de validation Sequelize en un format plus lisible
 */
function formatSequelizeValidationError(err: SequelizeError): {
  fields: Record<string, string>
} {
  const errors: Record<string, string> = {}
  if (err.errors && Array.isArray(err.errors)) {
    err.errors.forEach((error) => {
      errors[error.path] = error.message
    })
  }
  return { fields: errors }
}

/**
 * Crée une réponse d'erreur au format standardisé
 */
function formatErrorResponse(
  ctx: Context,
  message: string,
  code: string,
  statusCode: number,
  details?: any
): ErrorResponse {
  return {
    success: false,
    error: {
      message,
      code,
      statusCode,
      details,
    },
    timestamp: new Date().toISOString(),
    path: ctx.path,
  }
}
