/**
 * Classe de base pour toutes les erreurs d'API
 */
export class ApiError extends Error {
  statusCode: number
  errorCode: string
  details?: any

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = "INTERNAL_SERVER_ERROR",
    details?: any
  ) {
    super(message)
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.details = details
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Erreurs 400 - Bad Request
 */
export class BadRequestError extends ApiError {
  constructor(
    message: string = "Bad request",
    errorCode: string = "BAD_REQUEST",
    details?: any
  ) {
    super(message, 400, errorCode, details)
  }
}

/**
 * Erreurs 401 - Unauthorized
 */
export class UnauthorizedError extends ApiError {
  constructor(
    message: string = "Authentication required",
    errorCode: string = "UNAUTHORIZED",
    details?: any
  ) {
    super(message, 401, errorCode, details)
  }
}

/**
 * Erreurs 403 - Forbidden
 */
export class ForbiddenError extends ApiError {
  constructor(
    message: string = "Access denied",
    errorCode: string = "FORBIDDEN",
    details?: any
  ) {
    super(message, 403, errorCode, details)
  }
}

/**
 * Erreurs 404 - Not Found
 */
export class NotFoundError extends ApiError {
  constructor(
    message: string = "Resource not found",
    errorCode: string = "NOT_FOUND",
    details?: any
  ) {
    super(message, 404, errorCode, details)
  }
}

/**
 * Erreurs 409 - Conflict
 */
export class ConflictError extends ApiError {
  constructor(
    message: string = "Resource conflict",
    errorCode: string = "CONFLICT",
    details?: any
  ) {
    super(message, 409, errorCode, details)
  }
}

/**
 * Erreurs 422 - Unprocessable Entity (Validation)
 */
export class ValidationError extends ApiError {
  constructor(
    message: string = "Validation failed",
    errorCode: string = "VALIDATION_ERROR",
    details?: any
  ) {
    super(message, 422, errorCode, details)
  }
}

/**
 * Erreurs 500 - Internal Server Error
 */
export class InternalServerError extends ApiError {
  constructor(
    message: string = "Internal server error",
    errorCode: string = "INTERNAL_SERVER_ERROR",
    details?: any
  ) {
    super(message, 500, errorCode, details)
  }
}

/**
 * Erreurs 503 - Service Unavailable
 */
export class ServiceUnavailableError extends ApiError {
  constructor(
    message: string = "Service temporarily unavailable",
    errorCode: string = "SERVICE_UNAVAILABLE",
    details?: any
  ) {
    super(message, 503, errorCode, details)
  }
}
