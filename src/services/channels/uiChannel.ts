import { io } from "../../config/socket"

/**
 * Gestionnaire de notifications UI (temps réel)
 * Utilise Socket.IO pour envoyer des notifications temps réel
 */
export class UiChannel {
  /**
   * Envoie une notification UI à l'utilisateur
   */
  async send(notification: any): Promise<any> {
    try {
      const userId = notification.get("userId")

      if (!userId) {
        throw new Error("No user ID specified for UI notification")
      }

      // Données à envoyer
      const notificationData = {
        id: notification.get("id"),
        title: notification.get("title"),
        content: notification.get("content"),
        type: notification.get("type"),
        createdAt: notification.get("createdAt"),
        metadata: notification.get("metadata") || {},
      }

      // Émettre l'événement Socket.IO vers l'utilisateur
      io.to(`user:${userId}`).emit("notification", notificationData)

      // Si tenantId est disponible, émettre également vers tous les admins du tenant
      if (notification.get("tenantId")) {
        io.to(`tenant_admins:${notification.get("tenantId")}`).emit("notification", {
          ...notificationData,
          forUser: userId,
        })
      }

      return {
        delivered: true,
        timestamp: new Date(),
      }
    } catch (error) {
      console.error("UI notification failed:", error)
      throw error
    }
  }
}
