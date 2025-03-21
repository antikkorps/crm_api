import { Context } from "koa"
import { Op } from "sequelize"
import { Notification, NotificationTemplate } from "../models"
import { NotificationStatus } from "../models/notification" // Corriger l'importation pour accéder directement à l'enum
import { notificationService } from "../services/notificationService"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { paginatedQuery } from "../utils/pagination"
import { renderTemplate } from "../utils/templateRenderer"

/**
 * Récupère les notifications d'un utilisateur
 */
export const getUserNotifications = async (ctx: Context) => {
  try {
    // Par défaut, récupère les notifications de l'utilisateur courant
    const userId = ctx.params.userId || ctx.state.user.id

    // Vérifier si l'utilisateur a le droit de voir ces notifications
    if (userId !== ctx.state.user.id && !ctx.state.user.isAdmin) {
      throw new NotFoundError("Notifications not found")
    }

    // Filtrer par statut si spécifié
    let whereClause: any = { userId }

    if (ctx.query.status) {
      whereClause.status = ctx.query.status
    }

    const result = await paginatedQuery(Notification, ctx, {
      where: whereClause,
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère les notifications non lues d'un utilisateur
 */
export const getUnreadNotifications = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id

    const result = await paginatedQuery(Notification, ctx, {
      where: {
        userId,
        status: {
          [Op.ne]: NotificationStatus.READ,
        },
      },
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère une notification par son ID
 */
export const getNotificationById = async (ctx: Context) => {
  try {
    const notification = await Notification.findByPk(ctx.params.id)

    if (!notification) {
      throw new NotFoundError(`Notification with ID ${ctx.params.id} not found`)
    }

    // Vérifier si l'utilisateur a le droit de voir cette notification
    if (
      notification.get("userId") !== ctx.state.user.id &&
      notification.get("tenantId") !== ctx.state.user.tenantId &&
      !ctx.state.user.isAdmin
    ) {
      throw new NotFoundError(`Notification with ID ${ctx.params.id} not found`)
    }

    ctx.body = notification
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Crée et envoie une notification
 */
export const createNotification = async (ctx: Context) => {
  try {
    const {
      title,
      content,
      type,
      channel,
      userId,
      templateId,
      templateCode,
      templateData,
      metadata,
      webhookId,
    } = ctx.request.body as any

    // Vérification de base
    if (!channel) {
      throw new BadRequestError("Notification channel is required")
    }

    // Si pas de template, le titre et contenu sont obligatoires
    if (!templateId && !templateCode && (!title || !content)) {
      throw new BadRequestError(
        "Title and content are required if no template is specified"
      )
    }

    const notification = await notificationService.createAndSend({
      title,
      content,
      type,
      channel,
      userId,
      templateId,
      templateCode,
      templateData,
      metadata,
      webhookId,
      tenantId: ctx.state.user.tenantId,
    })

    ctx.status = 201
    ctx.body = notification
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Marque une notification comme lue
 */
export const markNotificationAsRead = async (ctx: Context) => {
  try {
    const notificationId = ctx.params.id
    const userId = ctx.state.user.id

    const notification = await notificationService.markAsRead(notificationId, userId)

    ctx.body = notification
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Marque toutes les notifications d'un utilisateur comme lues
 */
export const markAllAsRead = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id

    await Notification.update(
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
      {
        where: {
          userId,
          status: {
            [Op.ne]: NotificationStatus.READ,
          },
        },
      }
    )

    ctx.body = {
      success: true,
      message: "All notifications marked as read",
    }
  } catch (error: unknown) {
    throw error
  }
}

// ----- Gestion des templates de notification -----

/**
 * Récupère tous les templates de notification
 */
export const getAllTemplates = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(NotificationTemplate, ctx, {
      where: { tenantId: ctx.state.user.tenantId },
      order: [["name", "ASC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère un template par son ID
 */
export const getTemplateById = async (ctx: Context) => {
  try {
    const template = await NotificationTemplate.findByPk(ctx.params.id)

    if (!template) {
      throw new NotFoundError(`Template with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès à ce template
    if (template.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Template with ID ${ctx.params.id} not found`)
    }

    ctx.body = template
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Crée un nouveau template de notification
 */
export const createTemplate = async (ctx: Context) => {
  try {
    const { name, description, code, subject, content, type, defaultChannel, variables } =
      ctx.request.body as any

    // Vérifications de base
    if (!name || !code || !subject || !content) {
      throw new BadRequestError("Name, code, subject and content are required")
    }

    // Vérifier que le code est unique pour ce tenant
    const existingTemplate = await NotificationTemplate.findOne({
      where: {
        code,
        tenantId: ctx.state.user.tenantId,
      },
    })

    if (existingTemplate) {
      throw new BadRequestError(`A template with code "${code}" already exists`)
    }

    const template = await NotificationTemplate.create({
      name,
      description,
      code,
      subject,
      content,
      type,
      defaultChannel,
      variables,
      isActive: true,
      tenantId: ctx.state.user.tenantId,
    })

    ctx.status = 201
    ctx.body = template
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Met à jour un template de notification
 */
export const updateTemplate = async (ctx: Context) => {
  try {
    const template = await NotificationTemplate.findByPk(ctx.params.id)

    if (!template) {
      throw new NotFoundError(`Template with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès à ce template
    if (template.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Template with ID ${ctx.params.id} not found`)
    }

    const {
      name,
      description,
      subject,
      content,
      type,
      defaultChannel,
      variables,
      isActive,
    } = ctx.request.body as any

    await template.update({
      name: name !== undefined ? name : template.get("name"),
      description: description !== undefined ? description : template.get("description"),
      subject: subject !== undefined ? subject : template.get("subject"),
      content: content !== undefined ? content : template.get("content"),
      type: type !== undefined ? type : template.get("type"),
      defaultChannel:
        defaultChannel !== undefined ? defaultChannel : template.get("defaultChannel"),
      variables: variables !== undefined ? variables : template.get("variables"),
      isActive: isActive !== undefined ? isActive : template.get("isActive"),
    })

    ctx.body = template
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Supprime un template de notification
 */
export const deleteTemplate = async (ctx: Context) => {
  try {
    const template = await NotificationTemplate.findByPk(ctx.params.id)

    if (!template) {
      throw new NotFoundError(`Template with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès à ce template
    if (template.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Template with ID ${ctx.params.id} not found`)
    }

    await template.destroy()

    ctx.status = 204
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Prévisualise un template avec des données de test
 */
export const previewTemplate = async (ctx: Context) => {
  try {
    const { templateId, templateCode, data } = ctx.request.body as any

    if (!templateId && !templateCode) {
      throw new BadRequestError("Either templateId or templateCode is required")
    }

    let template

    if (templateId) {
      template = await NotificationTemplate.findByPk(templateId)
    } else if (templateCode) {
      template = await NotificationTemplate.findOne({
        where: {
          code: templateCode,
          tenantId: ctx.state.user.tenantId,
        },
      })
    }

    if (!template) {
      throw new NotFoundError("Template not found")
    }

    // Vérifier que l'utilisateur a accès à ce template
    if (template.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError("Template not found")
    }

    // Rendre le template avec les données fournies ou des données de test
    const templateData = data || {
      user: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
      },
      company: {
        name: "ACME Inc.",
        website: "https://example.com",
      },
      contact: {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
      },
      date: new Date().toISOString(),
      // Autres données de test...
    }

    const renderedSubject = renderTemplate(
      template.get("subject") as string,
      templateData
    )
    const renderedContent = renderTemplate(
      template.get("content") as string,
      templateData
    )

    ctx.body = {
      subject: renderedSubject,
      content: renderedContent,
    }
  } catch (error: unknown) {
    throw error
  }
}
