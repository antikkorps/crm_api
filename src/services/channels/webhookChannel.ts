import crypto from "crypto"
import { Webhook } from "../../models"

interface WebhookStats {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
}

/**
 * Gestionnaire de notifications par webhook
 */
export class WebhookChannel {
  /**
   * Envoie une notification via webhook
   */
  async send(notification: any): Promise<any> {
    try {
      const webhookId = notification.get("webhookId")

      if (!webhookId) {
        throw new Error("No webhook ID specified for webhook notification")
      }

      // Récupérer la configuration du webhook
      const webhook = await Webhook.findByPk(webhookId)

      if (!webhook) {
        throw new Error(`Webhook not found: ${webhookId}`)
      }

      // Construire les données à envoyer
      const payload = {
        id: notification.get("id"),
        title: notification.get("title"),
        content: notification.get("content"),
        type: notification.get("type"),
        created_at: notification.get("createdAt"),
        tenant_id: notification.get("tenantId"),
        metadata: notification.get("metadata") || {},
        data: notification.get("contextData") || {},
      }

      // Générer une signature HMAC si un secret est défini
      let signature
      if (webhook.get("secret")) {
        signature = this.generateSignature(
          JSON.stringify(payload),
          webhook.get("secret") as string
        )
      }

      // Préparer les en-têtes
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "CRM-API-Webhook",
        ...(webhook.get("headers") || {}),
      }

      // Ajouter la signature si disponible
      if (signature) {
        headers["X-Webhook-Signature"] = signature
      }

      // Envoyer la requête
      const response = await fetch(webhook.get("url") as string, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      // Mettre à jour les statistiques du webhook
      const stats = (webhook.get("stats") as WebhookStats) || {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
      }

      stats.totalExecutions++
      stats.successfulExecutions++

      await webhook.update({
        lastAttemptAt: new Date(),
        lastAttemptResult: {
          status: response.status,
          statusText: response.statusText,
          timestamp: new Date(),
        },
        stats,
      })

      return {
        status: response.status,
        statusText: response.statusText,
      }
    } catch (error) {
      // En cas d'erreur, mettre à jour les statistiques du webhook
      if (notification.get("webhookId")) {
        try {
          const webhook = await Webhook.findByPk(notification.get("webhookId"))

          if (webhook) {
            const stats = (webhook.get("stats") as WebhookStats) || {
              totalExecutions: 0,
              successfulExecutions: 0,
              failedExecutions: 0,
            }

            stats.totalExecutions++
            stats.failedExecutions++

            await webhook.update({
              lastAttemptAt: new Date(),
              lastAttemptResult: {
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
              },
              stats,
            })
          }
        } catch (statsError) {
          console.error("Failed to update webhook stats:", statsError)
        }
      }

      throw error
    }
  }

  /**
   * Génère une signature HMAC pour le payload
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex")
  }
}
