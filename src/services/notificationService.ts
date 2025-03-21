import { Op } from "sequelize"
import { Notification, NotificationTemplate } from "../models"
import { NotificationChannel, NotificationStatus } from "../models/notification"
import { renderTemplate } from "../utils/templateRenderer"
import { EmailChannel } from "./channels/emailChannel"
import { UiChannel } from "./channels/uiChannel"
import { WebhookChannel } from "./channels/webhookChannel"

// Type pour les options de création de notification
interface CreateNotificationOptions {
  title?: string
  content?: string
  type?: string
  channel: NotificationChannel
  userId?: string
  templateId?: string
  templateCode?: string
  templateData?: Record<string, any>
  metadata?: Record<string, any>
  tenantId: string
  webhookId?: string
}

/**
 * Service principal de notifications
 */
class NotificationService {
  private channels: Map<NotificationChannel, any> = new Map()

  constructor() {
    // Initialiser les canaux de notification disponibles
    this.registerChannel(NotificationChannel.EMAIL, new EmailChannel())
    this.registerChannel(NotificationChannel.WEBHOOK, new WebhookChannel())
    this.registerChannel(NotificationChannel.UI, new UiChannel())
  }

  /**
   * Enregistre un canal de notification
   */
  registerChannel(channelType: NotificationChannel, handler: any): void {
    this.channels.set(channelType, handler)
  }

  /**
   * Crée et envoie une notification
   */
  async createAndSend(options: CreateNotificationOptions): Promise<any> {
    try {
      // Si un template est spécifié, le charger et rendre le contenu
      if (options.templateId || options.templateCode) {
        const template = await this.getTemplate(
          options.templateId,
          options.templateCode,
          options.tenantId
        )

        if (!template) {
          throw new Error(
            `Template not found: ${options.templateId || options.templateCode}`
          )
        }

        // Rendre le sujet et le contenu avec les données
        const renderedSubject = renderTemplate(
          template.get("subject"),
          options.templateData || {}
        )
        const renderedContent = renderTemplate(
          template.get("content"),
          options.templateData || {}
        )

        options.title = renderedSubject
        options.content = renderedContent

        // Si le canal n'est pas spécifié, utiliser celui par défaut du template
        if (!options.channel) {
          options.channel = template.get("defaultChannel") as NotificationChannel
        }
      }

      // Créer l'enregistrement de notification
      const notification = await Notification.create({
        title: options.title,
        content: options.content,
        type: options.type,
        channel: options.channel,
        status: NotificationStatus.PENDING,
        metadata: options.metadata || {},
        userId: options.userId,
        templateId: options.templateId,
        webhookId: options.webhookId,
        tenantId: options.tenantId,
      })

      // Envoyer la notification via le canal approprié
      await this.sendNotification(notification)

      return notification
    } catch (error) {
      console.error("Error creating notification:", error)
      throw error
    }
  }

  /**
   * Récupère un template par ID ou code
   */
  private async getTemplate(
    templateId?: string,
    templateCode?: string,
    tenantId?: string
  ): Promise<any> {
    if (templateId) {
      return await NotificationTemplate.findByPk(templateId)
    } else if (templateCode && tenantId) {
      return await NotificationTemplate.findOne({
        where: {
          code: templateCode,
          tenantId,
          isActive: true,
        },
      })
    }
    return null
  }

  /**
   * Envoie une notification existante
   */
  async sendNotification(notification: any): Promise<boolean> {
    const channel = notification.get("channel") as NotificationChannel

    // Vérifier si le canal est pris en charge
    if (!this.channels.has(channel)) {
      await notification.update({
        status: NotificationStatus.FAILED,
        executionLog: [
          {
            timestamp: new Date(),
            message: `Unsupported notification channel: ${channel}`,
            success: false,
          },
        ],
      })
      return false
    }

    try {
      // Obtenir le gestionnaire de canal
      const channelHandler = this.channels.get(channel)

      // Enregistrer la tentative dans le log d'exécution
      let executionLog = notification.get("executionLog") || []
      executionLog.push({
        timestamp: new Date(),
        message: `Attempting to send via ${channel}`,
        success: true,
      })

      await notification.update({ executionLog })

      // Envoyer via le canal approprié
      const result = await channelHandler.send(notification)

      // Mettre à jour le statut et le log
      executionLog = notification.get("executionLog") || []
      executionLog.push({
        timestamp: new Date(),
        message: `Successfully sent via ${channel}`,
        success: true,
        result,
      })

      await notification.update({
        status: NotificationStatus.SENT,
        executionLog,
        sentAt: new Date(),
      })

      return true
    } catch (error: any) {
      // En cas d'échec, enregistrer l'erreur
      const executionLog = notification.get("executionLog") || []
      executionLog.push({
        timestamp: new Date(),
        message: `Failed to send via ${channel}: ${error.message}`,
        success: false,
        error: error.message,
      })

      await notification.update({
        status: NotificationStatus.FAILED,
        executionLog,
      })

      console.error(`Error sending notification via ${channel}:`, error)
      return false
    }
  }

  /**
   * Marque une notification comme lue
   */
  async markAsRead(id: string, userId: string): Promise<any> {
    const notification = await Notification.findOne({
      where: {
        id,
        userId,
      },
    })

    if (!notification) {
      throw new Error(`Notification not found: ${id}`)
    }

    if (notification.get("status") === NotificationStatus.READ) {
      return notification
    }

    await notification.update({
      status: NotificationStatus.READ,
      readAt: new Date(),
    })

    return notification
  }

  /**
   * Récupère les notifications non lues pour un utilisateur
   */
  async getUnreadNotifications(userId: string, limit = 10): Promise<any[]> {
    const notifications = await Notification.findAll({
      where: {
        userId,
        status: {
          [Op.ne]: NotificationStatus.READ,
        },
      },
      order: [["createdAt", "DESC"]],
      limit,
    })

    return notifications
  }
}

// Exporter une instance singleton
export const notificationService = new NotificationService()
