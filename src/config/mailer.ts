import nodemailer, { Transporter } from "nodemailer"

// Configuration pour le mailer
let transporter: Transporter

// Initialiser le transporteur Nodemailer
export const initMailer = (): void => {
  // En développement, utiliser Ethereal pour tester
  if (process.env.NODE_ENV === "development" && !process.env.SMTP_HOST) {
    console.log("Creating test email account for development")
    nodemailer
      .createTestAccount()
      .then(
        (testAccount: {
          user: string
          pass: string
          smtp: { host: string; port: number; secure: boolean }
          web: string
        }) => {
          console.log("Test email account created:", testAccount)

          transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          })
          console.log("Development email transport configured")
        }
      )
  } else {
    // En production, utiliser les paramètres SMTP configurés
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
    console.log("Production email transport configured")
  }
}

// Récupérer le transporteur
export const getMailer = (): Transporter => {
  if (!transporter) {
    throw new Error("Email transporter not initialized")
  }
  return transporter
}

// Vérifier que la connexion est fonctionnelle
export const verifyMailerConnection = async (): Promise<boolean> => {
  try {
    if (!transporter) {
      throw new Error("Email transporter not initialized")
    }
    await transporter.verify()
    console.log("Email server connection verified successfully")
    return true
  } catch (error) {
    console.error("Email server connection failed:", error)
    return false
  }
}
