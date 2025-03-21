import { Context } from "koa"
import { Op } from "sequelize"
import { Activity, Company, Contact, User } from "../models"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { paginatedQuery } from "../utils/pagination"

/**
 * Récupère toutes les activités
 */
export const getAllActivities = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Activity, ctx, {
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: User, as: "assignedTo", attributes: { exclude: ["password"] } },
        { model: Contact },
        { model: Company },
      ],
      where: { tenantId: ctx.state.user.tenantId },
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère une activité par son ID
 */
export const getActivityById = async (ctx: Context) => {
  try {
    const activity = await Activity.findByPk(ctx.params.id, {
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: User, as: "assignedTo", attributes: { exclude: ["password"] } },
        { model: Contact },
        { model: Company },
      ],
    })

    if (!activity) {
      throw new NotFoundError(`Activity with ID ${ctx.params.id} not found`)
    }

    ctx.body = activity
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Filtre les activités par type
 */
export const getActivitiesByType = async (ctx: Context) => {
  try {
    const { type } = ctx.params
    if (!["NOTE", "CALL", "EMAIL", "MEETING", "TASK"].includes(type)) {
      throw new BadRequestError(`Invalid activity type: ${type}`)
    }

    const result = await paginatedQuery(Activity, ctx, {
      where: {
        tenantId: ctx.state.user.tenantId,
        type,
      },
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: User, as: "assignedTo", attributes: { exclude: ["password"] } },
        { model: Contact },
        { model: Company },
      ],
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère les activités liées à un contact
 */
export const getActivitiesByContact = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Activity, ctx, {
      where: {
        tenantId: ctx.state.user.tenantId,
        contactId: ctx.params.contactId,
      },
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: User, as: "assignedTo", attributes: { exclude: ["password"] } },
        { model: Company },
      ],
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère les activités liées à une entreprise
 */
export const getActivitiesByCompany = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Activity, ctx, {
      where: {
        tenantId: ctx.state.user.tenantId,
        companyId: ctx.params.companyId,
      },
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: User, as: "assignedTo", attributes: { exclude: ["password"] } },
        { model: Contact },
      ],
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère les activités créées par un utilisateur
 */
export const getActivitiesByUser = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Activity, ctx, {
      where: {
        tenantId: ctx.state.user.tenantId,
        createdById: ctx.params.userId || ctx.state.user.id,
      },
      include: [
        { model: Contact },
        { model: Company },
        { model: User, as: "assignedTo", attributes: { exclude: ["password"] } },
      ],
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère les activités récentes (derniers X jours)
 */
export const getRecentActivities = async (ctx: Context) => {
  try {
    const daysAgo = parseInt(ctx.query.days as string) || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    const result = await paginatedQuery(Activity, ctx, {
      where: {
        tenantId: ctx.state.user.tenantId,
        createdAt: { [Op.gte]: startDate },
      },
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: User, as: "assignedTo", attributes: { exclude: ["password"] } },
        { model: Contact },
        { model: Company },
      ],
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Crée une nouvelle activité
 */
export const createActivity = async (ctx: Context) => {
  try {
    const activityData = {
      ...(ctx.request as any).body,
      createdById: ctx.state.user.id,
      tenantId: ctx.state.user.tenantId,
    }

    // Validation du type d'activité
    if (!["NOTE", "CALL", "EMAIL", "MEETING", "TASK"].includes(activityData.type)) {
      throw new BadRequestError("Invalid activity type")
    }

    // Validation spécifique à chaque type
    validateActivityFields(activityData)

    const activity = await Activity.create(activityData)

    // Récupérer l'activité créée avec ses relations
    const createdActivity = await Activity.findByPk((activity as any).id, {
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: User, as: "assignedTo", attributes: { exclude: ["password"] } },
        { model: Contact },
        { model: Company },
      ],
    })

    ctx.status = 201
    ctx.body = createdActivity
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Met à jour une activité
 */
export const updateActivity = async (ctx: Context) => {
  try {
    const activity = await Activity.findByPk(ctx.params.id)

    if (!activity) {
      throw new NotFoundError(`Activity with ID ${ctx.params.id} not found`)
    }

    // Vérifier les permissions (créateur ou assigné)
    const userId = ctx.state.user.id
    if (
      activity.get("createdById") !== userId &&
      activity.get("assignedToId") !== userId
    ) {
      throw new NotFoundError("You don't have permission to update this activity")
    }

    const updateData = (ctx.request as any).body

    // Si le type est modifié, valider le nouveau type
    if (updateData.type && updateData.type !== activity.get("type")) {
      if (!["NOTE", "CALL", "EMAIL", "MEETING", "TASK"].includes(updateData.type)) {
        throw new BadRequestError("Invalid activity type")
      }
      // Validation des champs pour le nouveau type
      validateActivityFields({ ...activity.toJSON(), ...updateData })
    }

    await activity.update(updateData)

    // Récupérer l'activité mise à jour avec ses relations
    const updatedActivity = await Activity.findByPk(ctx.params.id, {
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: User, as: "assignedTo", attributes: { exclude: ["password"] } },
        { model: Contact },
        { model: Company },
      ],
    })

    ctx.body = updatedActivity
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Supprime une activité
 */
export const deleteActivity = async (ctx: Context) => {
  try {
    const activity = await Activity.findByPk(ctx.params.id)

    if (!activity) {
      throw new NotFoundError(`Activity with ID ${ctx.params.id} not found`)
    }

    // Vérifier les permissions (seul le créateur peut supprimer)
    if (activity.get("createdById") !== ctx.state.user.id) {
      throw new NotFoundError("You don't have permission to delete this activity")
    }

    await activity.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Fonction utilitaire pour valider les champs spécifiques à chaque type d'activité
 */
function validateActivityFields(data: any): void {
  switch (data.type) {
    case "CALL":
      if (data.callDirection && !["INBOUND", "OUTBOUND"].includes(data.callDirection)) {
        throw new BadRequestError("Invalid call direction")
      }
      break

    case "EMAIL":
      if (!data.emailSubject) {
        throw new BadRequestError("Email subject is required for email activities")
      }
      if (
        data.emailStatus &&
        !["DRAFT", "SENT", "OPENED", "REPLIED"].includes(data.emailStatus)
      ) {
        throw new BadRequestError("Invalid email status")
      }
      break

    case "MEETING":
      if (!data.startTime) {
        throw new BadRequestError("Start time is required for meeting activities")
      }
      break

    case "TASK":
      if (!data.dueDate) {
        throw new BadRequestError("Due date is required for task activities")
      }
      if (data.priority && !["LOW", "MEDIUM", "HIGH"].includes(data.priority)) {
        throw new BadRequestError("Invalid task priority")
      }
      if (
        data.taskStatus &&
        !["TODO", "IN_PROGRESS", "DONE", "CANCELED"].includes(data.taskStatus)
      ) {
        throw new BadRequestError("Invalid task status")
      }
      break
  }
}
