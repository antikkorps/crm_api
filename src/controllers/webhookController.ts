import crypto from "crypto"
import { Context } from "koa"
import { Notification, User, Webhook } from "../models"
import { WebhookStatus } from "../models/webhook"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { paginatedQuery } from "../utils/pagination"

/**
 * Récupère tous les webhooks d'un tenant
 */
export const getAllWebhooks = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Webhook, ctx, {
      include: [{ model: User, as: "createdBy", attributes: { exclude: ["password"] } }],
      where: { tenantId: ctx.state.user.tenantId },
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère un webhook par son ID
 */
export const getWebhookById = async (ctx: Context) => {
  try {
    const webhook = await Webhook.findByPk(ctx.params.id, {
      include: [{ model: User, as: "createdBy", attributes: { exclude: ["password"] } }],
    })

    if (!webhook) {
      throw new NotFoundError(`Webhook with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès à ce webhook
    if (webhook.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Webhook with ID ${ctx.params.id} not found`)
    }

    ctx.body = webhook
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Crée un nouveau webhook
 */
export const createWebhook = async (ctx: Context) => {
  try {
    const { name, description, url, events, headers, retryConfig } = ctx.request
      .body as any

    // Vérifications de base
    if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
      throw new BadRequestError("Name, URL and at least one event are required")
    }

    // Générer un secret pour l'authentification des webhooks
    const secret = crypto.randomBytes(32).toString("hex")

    const webhook = await Webhook.create({
      name,
      description,
      url,
      events,
      headers: headers || {},
      secret,
      retryConfig: retryConfig || { maxRetries: 3, retryIntervalMinutes: 5 },
      status: WebhookStatus.ACTIVE,
      tenantId: ctx.state.user.tenantId,
      createdById: ctx.state.user.id,
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
      },
    })

    ctx.status = 201
    ctx.body = {
      ...webhook.get({ plain: true }),
      // Inclure le secret uniquement lors de la création
      // Il ne sera plus visible après
      secret,
    }
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Met à jour un webhook
 */
export const updateWebhook = async (ctx: Context) => {
  try {
    const webhook = await Webhook.findByPk(ctx.params.id)

    if (!webhook) {
      throw new NotFoundError(`Webhook with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès à ce webhook
    if (webhook.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Webhook with ID ${ctx.params.id} not found`)
    }

    const { name, description, url, events, headers, retryConfig, status } = ctx.request
      .body as any

    // Si des événements sont fournis, vérifier qu'il y en a au moins un
    if (events && (!Array.isArray(events) || events.length === 0)) {
      throw new BadRequestError("At least one event is required")
    }

    await webhook.update({
      name: name !== undefined ? name : webhook.get("name"),
      description: description !== undefined ? description : webhook.get("description"),
      url: url !== undefined ? url : webhook.get("url"),
      events: events !== undefined ? events : webhook.get("events"),
      headers: headers !== undefined ? headers : webhook.get("headers"),
      retryConfig: retryConfig !== undefined ? retryConfig : webhook.get("retryConfig"),
      status: status !== undefined ? status : webhook.get("status"),
    })

    ctx.body = webhook
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Régénère le secret d'un webhook
 */
export const regenerateWebhookSecret = async (ctx: Context) => {
  try {
    const webhook = await Webhook.findByPk(ctx.params.id)

    if (!webhook) {
      throw new NotFoundError(`Webhook with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès à ce webhook
    if (webhook.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Webhook with ID ${ctx.params.id} not found`)
    }

    // Générer un nouveau secret
    const secret = crypto.randomBytes(32).toString("hex")

    await webhook.update({ secret })

    ctx.body = {
      id: webhook.get("id"),
      secret,
    }
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Supprime un webhook
 */
export const deleteWebhook = async (ctx: Context) => {
  try {
    const webhook = await Webhook.findByPk(ctx.params.id)

    if (!webhook) {
      throw new NotFoundError(`Webhook with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès à ce webhook
    if (webhook.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Webhook with ID ${ctx.params.id} not found`)
    }

    await webhook.destroy()

    ctx.status = 204
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Teste un webhook
 */
export const testWebhook = async (ctx: Context) => {
  try {
    const webhook = await Webhook.findByPk(ctx.params.id)

    if (!webhook) {
      throw new NotFoundError(`Webhook with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès à ce webhook
    if (webhook.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Webhook with ID ${ctx.params.id} not found`)
    }

    // Construire un payload de test
    const testPayload = {
      id: "test-" + crypto.randomBytes(8).toString("hex"),
      title: "Test Webhook",
      event: "webhook.test",
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: "This is a test webhook from your CRM API",
      },
    }

    // Générer une signature si un secret est défini
    let signature
    if (webhook.get("secret")) {
      signature = crypto
        .createHmac("sha256", webhook.get("secret") as string)
        .update(JSON.stringify(testPayload))
        .digest("hex")
    }

    // Préparer les en-têtes
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "CRM-API-Webhook-Test",
      ...(webhook.get("headers") || {}),
    }

    // Ajouter la signature si disponible
    if (signature) {
      headers["X-Webhook-Signature"] = signature
    }

    try {
      // Envoyer la requête
      const response = await fetch(webhook.get("url") as string, {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
      })

      const responseBody = await response.text()

      // Mettre à jour la date de dernière tentative et le résultat
      await webhook.update({
        lastAttemptAt: new Date(),
        lastAttemptResult: {
          status: response.status,
          statusText: response.statusText,
          body: responseBody.substring(0, 1000), // Limiter à 1000 caractères
          timestamp: new Date(),
          isTest: true,
        },
      })

      ctx.body = {
        success: response.ok,
        statusCode: response.status,
        statusText: response.statusText,
        response: responseBody.substring(0, 1000),
      }
    } catch (error: any) {
      // Mettre à jour en cas d'erreur
      await webhook.update({
        lastAttemptAt: new Date(),
        lastAttemptResult: {
          error: error.message,
          timestamp: new Date(),
          isTest: true,
        },
      })

      ctx.body = {
        success: false,
        error: error.message,
      }
    }
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère l'historique d'exécution d'un webhook
 */
export const getWebhookExecutionHistory = async (ctx: Context) => {
  try {
    const webhookId = ctx.params.id

    const webhook = await Webhook.findByPk(webhookId)

    if (!webhook) {
      throw new NotFoundError(`Webhook with ID ${webhookId} not found`)
    }

    // Vérifier que l'utilisateur a accès à ce webhook
    if (webhook.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Webhook with ID ${webhookId} not found`)
    }

    // Récupérer les notifications liées à ce webhook
    const result = await paginatedQuery(Notification, ctx, {
      where: { webhookId },
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}
