import { Context } from "koa"
import { Op } from "sequelize"
import { Activity, Company, Contact, Role, User, sequelize } from "../models"
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors"
import { paginatedQuery } from "../utils/pagination"

/**
 * Récupère toutes les activités
 */
export const getAllActivities = async (ctx: Context) => {
  try {
    const whereClause: any = { tenantId: ctx.state.user.tenantId }

    // Filtrage par types si le paramètre est fourni
    if (ctx.query.types) {
      const types = (ctx.query.types as string)
        .split(",")
        .map((type) => type.trim().toUpperCase())

      whereClause.type = { [Op.in]: types }
    }

    // Filtrage par dates
    if (ctx.query.startDate) {
      whereClause.createdAt = { [Op.gte]: new Date(ctx.query.startDate as string) }
    }
    if (ctx.query.endDate) {
      const endDate = new Date(ctx.query.endDate as string)
      endDate.setHours(23, 59, 59, 999) // Fin de journée
      whereClause.createdAt = {
        ...whereClause.createdAt,
        [Op.lte]: endDate,
      }
    }

    // Filtrage par priorité
    if (ctx.query.priority) {
      const priorities = (ctx.query.priority as string)
        .split(",")
        .map((priority) => priority.trim().toUpperCase())
      whereClause.priority = { [Op.in]: priorities }
    }

    // Filtrage par statut générique
    if (ctx.query.status) {
      const statuses = (ctx.query.status as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.status = { [Op.in]: statuses }
    }

    // Filtrage par statut de tâche
    if (ctx.query.taskStatus) {
      const taskStatuses = (ctx.query.taskStatus as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.taskStatus = { [Op.in]: taskStatuses }
    }

    // Filtrage par résultat d'appel
    if (ctx.query.callOutcome) {
      const callOutcomes = (ctx.query.callOutcome as string)
        .split(",")
        .map((outcome) => outcome.trim().toUpperCase())
      whereClause.callOutcome = { [Op.in]: callOutcomes }
    }

    // Filtrage par statut d'email
    if (ctx.query.emailStatus) {
      const emailStatuses = (ctx.query.emailStatus as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.emailStatus = { [Op.in]: emailStatuses }
    }

    // Filtrage par utilisateur créateur
    if (ctx.query.createdBy) {
      const createdByIds = (ctx.query.createdBy as string)
        .split(",")
        .map((id) => id.trim())
      whereClause.createdById = { [Op.in]: createdByIds }
    }

    // Filtrage par utilisateur assigné
    if (ctx.query.assignedTo) {
      const assignedToIds = (ctx.query.assignedTo as string)
        .split(",")
        .map((id) => id.trim())
      whereClause.assignedToId = { [Op.in]: assignedToIds }
    }

    // Appliquer les filtres de progression (uniquement pour les tâches)
    applyProgressFilters(whereClause, ctx)

    const result = await paginatedQuery(Activity, ctx, {
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: User, as: "assignedTo", attributes: { exclude: ["password"] } },
        { model: Contact },
        { model: Company },
      ],
      where: whereClause,
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère les tâches assignées à l'utilisateur courant
 */
export const getMyTasks = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Activity, ctx, {
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: Contact },
        { model: Company },
      ],
      where: {
        tenantId: ctx.state.user.tenantId,
        assignedToId: ctx.state.user.id,
        type: "TASK",
      },
      order: [
        // Priorité d'abord - HIGH en premier, puis MEDIUM, puis LOW
        [
          sequelize.literal(`CASE 
          WHEN "priority" = 'HIGH' THEN 1 
          WHEN "priority" = 'MEDIUM' THEN 2 
          WHEN "priority" = 'LOW' THEN 3
          ELSE 4
        END`),
          "ASC",
        ],
        // Ensuite par statut - PENDING et IN_PROGRESS en premier
        [
          sequelize.literal(`CASE 
          WHEN "taskStatus" = 'PENDING' THEN 1 
          WHEN "taskStatus" = 'IN_PROGRESS' THEN 2
          WHEN "taskStatus" = 'COMPLETED' THEN 3
          ELSE 4
        END`),
          "ASC",
        ],
        // Enfin par date de création, les plus récentes en premier
        ["createdAt", "DESC"],
      ],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère toutes les activités de l'utilisateur connecté
 * (créées par lui OU assignées à lui) avec filtres optionnels
 */
export const getMyActivities = async (ctx: Context) => {
  try {
    const whereClause: any = {
      tenantId: ctx.state.user.tenantId,
      [Op.or]: [{ createdById: ctx.state.user.id }, { assignedToId: ctx.state.user.id }],
    }

    // Filtrage par contact
    if (ctx.query.contactId) {
      whereClause.contactId = ctx.query.contactId
    }

    // Filtrage par entreprise
    if (ctx.query.companyId) {
      whereClause.companyId = ctx.query.companyId
    }

    // Filtrage par types si le paramètre est fourni
    if (ctx.query.types) {
      const types = (ctx.query.types as string)
        .split(",")
        .map((type) => type.trim().toUpperCase())
      whereClause.type = { [Op.in]: types }
    }

    // Filtrage par dates
    if (ctx.query.startDate) {
      whereClause.createdAt = { [Op.gte]: new Date(ctx.query.startDate as string) }
    }
    if (ctx.query.endDate) {
      const endDate = new Date(ctx.query.endDate as string)
      endDate.setHours(23, 59, 59, 999) // Fin de journée
      whereClause.createdAt = {
        ...whereClause.createdAt,
        [Op.lte]: endDate,
      }
    }

    // Filtrage par priorité
    if (ctx.query.priority) {
      const priorities = (ctx.query.priority as string)
        .split(",")
        .map((priority) => priority.trim().toUpperCase())
      whereClause.priority = { [Op.in]: priorities }
    }

    // Filtrage par statut générique
    if (ctx.query.status) {
      const statuses = (ctx.query.status as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.status = { [Op.in]: statuses }
    }

    // Filtrage par statut de tâche
    if (ctx.query.taskStatus) {
      const taskStatuses = (ctx.query.taskStatus as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.taskStatus = { [Op.in]: taskStatuses }
    }

    // Filtrage par résultat d'appel
    if (ctx.query.callOutcome) {
      const callOutcomes = (ctx.query.callOutcome as string)
        .split(",")
        .map((outcome) => outcome.trim().toUpperCase())
      whereClause.callOutcome = { [Op.in]: callOutcomes }
    }

    // Filtrage par statut d'email
    if (ctx.query.emailStatus) {
      const emailStatuses = (ctx.query.emailStatus as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.emailStatus = { [Op.in]: emailStatuses }
    }

    // Appliquer les filtres de progression (uniquement pour les tâches)
    applyProgressFilters(whereClause, ctx)

    const result = await paginatedQuery(Activity, ctx, {
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: User, as: "assignedTo", attributes: { exclude: ["password"] } },
        { model: Contact },
        { model: Company },
      ],
      where: whereClause,
      order: [
        // Priorité d'abord pour les tâches - HIGH en premier, puis MEDIUM, puis LOW
        [
          sequelize.literal(`CASE 
          WHEN "type" = 'TASK' AND "priority" = 'HIGH' THEN 1 
          WHEN "type" = 'TASK' AND "priority" = 'MEDIUM' THEN 2 
          WHEN "type" = 'TASK' AND "priority" = 'LOW' THEN 3
          ELSE 4
        END`),
          "ASC",
        ],
        // Ensuite par statut pour les tâches - PENDING et IN_PROGRESS en premier
        [
          sequelize.literal(`CASE 
          WHEN "type" = 'TASK' AND "taskStatus" = 'PENDING' THEN 1 
          WHEN "type" = 'TASK' AND "taskStatus" = 'IN_PROGRESS' THEN 2
          WHEN "type" = 'TASK' AND "taskStatus" = 'COMPLETED' THEN 3
          ELSE 4
        END`),
          "ASC",
        ],
        // Enfin par date de création, les plus récentes en premier
        ["createdAt", "DESC"],
      ],
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
    const whereClause: any = {
      tenantId: ctx.state.user.tenantId,
      contactId: ctx.params.contactId,
    }

    // Filtrage par types si le paramètre est fourni
    if (ctx.query.types) {
      const types = (ctx.query.types as string)
        .split(",")
        .map((type) => type.trim().toUpperCase())

      whereClause.type = { [Op.in]: types }
    }

    // Filtrage par dates
    if (ctx.query.startDate) {
      whereClause.createdAt = { [Op.gte]: new Date(ctx.query.startDate as string) }
    }
    if (ctx.query.endDate) {
      const endDate = new Date(ctx.query.endDate as string)
      endDate.setHours(23, 59, 59, 999) // Fin de journée
      whereClause.createdAt = {
        ...whereClause.createdAt,
        [Op.lte]: endDate,
      }
    }

    // Filtrage par priorité
    if (ctx.query.priority) {
      const priorities = (ctx.query.priority as string)
        .split(",")
        .map((priority) => priority.trim().toUpperCase())
      whereClause.priority = { [Op.in]: priorities }
    }

    // Filtrage par statut générique
    if (ctx.query.status) {
      const statuses = (ctx.query.status as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.status = { [Op.in]: statuses }
    }

    // Filtrage par statut de tâche
    if (ctx.query.taskStatus) {
      const taskStatuses = (ctx.query.taskStatus as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.taskStatus = { [Op.in]: taskStatuses }
    }

    // Filtrage par résultat d'appel
    if (ctx.query.callOutcome) {
      const callOutcomes = (ctx.query.callOutcome as string)
        .split(",")
        .map((outcome) => outcome.trim().toUpperCase())
      whereClause.callOutcome = { [Op.in]: callOutcomes }
    }

    // Filtrage par statut d'email
    if (ctx.query.emailStatus) {
      const emailStatuses = (ctx.query.emailStatus as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.emailStatus = { [Op.in]: emailStatuses }
    }

    // Filtrage par utilisateur créateur
    if (ctx.query.createdBy) {
      const createdByIds = (ctx.query.createdBy as string)
        .split(",")
        .map((id) => id.trim())
      whereClause.createdById = { [Op.in]: createdByIds }
    }

    // Filtrage par utilisateur assigné
    if (ctx.query.assignedTo) {
      const assignedToIds = (ctx.query.assignedTo as string)
        .split(",")
        .map((id) => id.trim())
      whereClause.assignedToId = { [Op.in]: assignedToIds }
    }

    // Appliquer les filtres de progression (uniquement pour les tâches)
    applyProgressFilters(whereClause, ctx)

    const result = await paginatedQuery(Activity, ctx, {
      where: whereClause,
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
    const whereClause: any = {
      tenantId: ctx.state.user.tenantId,
      companyId: ctx.params.companyId,
    }

    // Filtrage par types si le paramètre est fourni
    if (ctx.query.types) {
      const types = (ctx.query.types as string)
        .split(",")
        .map((type) => type.trim().toUpperCase())

      whereClause.type = { [Op.in]: types }
    }

    // Filtrage par dates
    if (ctx.query.startDate) {
      whereClause.createdAt = { [Op.gte]: new Date(ctx.query.startDate as string) }
    }
    if (ctx.query.endDate) {
      const endDate = new Date(ctx.query.endDate as string)
      endDate.setHours(23, 59, 59, 999) // Fin de journée
      whereClause.createdAt = {
        ...whereClause.createdAt,
        [Op.lte]: endDate,
      }
    }

    // Filtrage par priorité
    if (ctx.query.priority) {
      const priorities = (ctx.query.priority as string)
        .split(",")
        .map((priority) => priority.trim().toUpperCase())
      whereClause.priority = { [Op.in]: priorities }
    }

    // Filtrage par statut générique
    if (ctx.query.status) {
      const statuses = (ctx.query.status as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.status = { [Op.in]: statuses }
    }

    // Filtrage par statut de tâche
    if (ctx.query.taskStatus) {
      const taskStatuses = (ctx.query.taskStatus as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.taskStatus = { [Op.in]: taskStatuses }
    }

    // Filtrage par résultat d'appel
    if (ctx.query.callOutcome) {
      const callOutcomes = (ctx.query.callOutcome as string)
        .split(",")
        .map((outcome) => outcome.trim().toUpperCase())
      whereClause.callOutcome = { [Op.in]: callOutcomes }
    }

    // Filtrage par statut d'email
    if (ctx.query.emailStatus) {
      const emailStatuses = (ctx.query.emailStatus as string)
        .split(",")
        .map((status) => status.trim().toUpperCase())
      whereClause.emailStatus = { [Op.in]: emailStatuses }
    }

    // Filtrage par utilisateur créateur
    if (ctx.query.createdBy) {
      const createdByIds = (ctx.query.createdBy as string)
        .split(",")
        .map((id) => id.trim())
      whereClause.createdById = { [Op.in]: createdByIds }
    }

    // Filtrage par utilisateur assigné
    if (ctx.query.assignedTo) {
      const assignedToIds = (ctx.query.assignedTo as string)
        .split(",")
        .map((id) => id.trim())
      whereClause.assignedToId = { [Op.in]: assignedToIds }
    }

    // Appliquer les filtres de progression (uniquement pour les tâches)
    applyProgressFilters(whereClause, ctx)

    const result = await paginatedQuery(Activity, ctx, {
      where: whereClause,
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
    const createdById = activity.get("createdById")
    const assignedToId = activity.get("assignedToId")

    if (userId !== createdById && userId !== assignedToId) {
      // Si l'utilisateur n'est pas le créateur et n'est pas assigné,
      // vérifier s'il est admin pour autoriser quand même
      const user = await User.findByPk(userId)

      // Utiliser une assertion de type pour indiquer que roleId est une chaîne
      const roleId = user?.get("roleId") as string | undefined
      const role = roleId ? await Role.findByPk(roleId) : null

      if (!role || role.get("name") !== "Admin") {
        throw new ForbiddenError(
          "You don't have permission to update this activity",
          "INSUFFICIENT_PERMISSIONS",
          { activityId: ctx.params.id, userId }
        )
      }
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
    // Ajouter plus de détails au log d'erreur
    console.error("Error updating activity:", error)
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
 * Applique les filtres de progression uniquement aux tâches
 */
function applyProgressFilters(whereClause: any, ctx: Context): void {
  // Vérifier si des filtres de progression sont demandés
  const hasProgressFilter =
    ctx.query.progress || ctx.query.progressMin || ctx.query.progressMax

  if (!hasProgressFilter) {
    return // Aucun filtre de progression, ne rien faire
  }

  // Si des filtres de progression sont demandés, on force le type à TASK
  // et on ignore tout autre filtre de type
  whereClause.type = "TASK"

  // Filtrage par progression exacte (priorité sur les filtres de plage)
  if (ctx.query.progress) {
    const progress = parseInt(ctx.query.progress as string)
    if (!isNaN(progress) && progress >= 0 && progress <= 100) {
      whereClause.progress = progress
      return // Sortir ici pour éviter que les filtres de plage écrasent le filtre exact
    }
  }

  if (ctx.query.progressMin || ctx.query.progressMax) {
    const progressFilter: any = {}

    if (ctx.query.progressMin) {
      const min = parseInt(ctx.query.progressMin as string)
      if (!isNaN(min) && min >= 0 && min <= 100) {
        progressFilter[Op.gte] = min
      }
    }

    if (ctx.query.progressMax) {
      const max = parseInt(ctx.query.progressMax as string)
      if (!isNaN(max) && max <= 100 && max >= 0) {
        progressFilter[Op.lte] = max
      }
    }

    if (progressFilter[Op.gte] !== undefined || progressFilter[Op.lte] !== undefined) {
      whereClause.progress = progressFilter
    }
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
        !["TODO", "IN_PROGRESS", "DONE", "COMPLETED", "CANCELED"].includes(
          data.taskStatus
        )
      ) {
        throw new BadRequestError("Invalid task status")
      }
      break
  }
}
