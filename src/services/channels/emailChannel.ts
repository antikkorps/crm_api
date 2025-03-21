import nodemailer from "nodemailer"
import { getMailer } from "../../config/mailer"
import { User } from "../../models"

/**
 * Gestionnaire de notifications par email
 */
export class EmailChannel {
  /**
   * Envoie une notification par email
   */
  async send(notification: any): Promise<any> {
    try {
      const metadata = notification.get("metadata") || {}
      const userId = notification.get("userId")
      let recipient

      // Si un destinataire est explicitement spécifié dans les métadonnées
      if (metadata.recipient) {
        recipient = metadata.recipient
      }
      // Sinon, chercher l'email de l'utilisateur associé
      else if (userId) {
        const user = await User.findByPk(userId)
        if (!user) {
          throw new Error(`User not found: ${userId}`)
        }
        recipient = user.get("email")
      } else {
        throw new Error("No recipient specified for email notification")
      }

      const mailer = getMailer()
      const title = notification.get("title")
      const content = notification.get("content")

      // Configuration de l'email
      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@crm-api.com",
        to: recipient,
        subject: title,
        html: content,
        // Si des pièces jointes sont spécifiées
        attachments: metadata.attachments || [],
      }

      // Envoyer l'email
      const info = await mailer.sendMail(mailOptions)

      // En dev, loguer l'URL de prévisualisation d'Ethereal
      if (process.env.NODE_ENV === "development") {
        console.log("Email preview URL: %s", nodemailer.getTestMessageUrl(info))
      }

      return {
        messageId: info.messageId,
        previewUrl:
          process.env.NODE_ENV === "development"
            ? nodemailer.getTestMessageUrl(info)
            : null,
      }
    } catch (error) {
      console.error("Email sending failed:", error)
      throw error
    }
  }
}
