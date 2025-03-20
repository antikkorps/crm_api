import { Context } from "koa"
import { Company, Contact, Reminder, User } from "../models"
import { paginatedQuery } from "../utils/pagination"

export const getAllReminders = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Reminder, ctx, {
      include: [
        { model: User, as: "createdBy" },
        { model: User, as: "assignedTo" },
        { model: Contact },
        { model: Company },
      ],
      order: [["dueDate", "ASC"]],
      where: { tenantId: ctx.state.user.tenantId },
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getReminderById = async (ctx: Context) => {
  try {
    const reminder = await Reminder.findByPk(ctx.params.id, {
      include: [
        { model: User, as: "createdBy" },
        { model: User, as: "assignedTo" },
        { model: Contact },
        { model: Company },
      ],
    })
    if (!reminder) {
      ctx.status = 404
      ctx.body = { error: "Reminder not found" }
      return
    }
    ctx.body = reminder
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getRemindersByUser = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Reminder, ctx, {
      where: {
        assignedToId: ctx.params.userId || ctx.state.user.id,
      },
      include: [{ model: User, as: "createdBy" }, { model: Contact }, { model: Company }],
      order: [["dueDate", "ASC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getCurrentUserReminders = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Reminder, ctx, {
      where: {
        assignedToId: ctx.state.user.id,
      },
      include: [{ model: User, as: "createdBy" }, { model: Contact }, { model: Company }],
      order: [["dueDate", "ASC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getRemindersByContact = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Reminder, ctx, {
      where: {
        contactId: ctx.params.contactId,
      },
      include: [
        { model: User, as: "createdBy" },
        { model: User, as: "assignedTo" },
      ],
      order: [["dueDate", "ASC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getRemindersByCompany = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Reminder, ctx, {
      where: {
        companyId: ctx.params.companyId,
      },
      include: [
        { model: User, as: "createdBy" },
        { model: User, as: "assignedTo" },
      ],
      order: [["dueDate", "ASC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getUpcomingReminders = async (ctx: Context) => {
  try {
    const now = new Date()
    const endDate = new Date()
    const days = parseInt(ctx.query.days as string) || 7

    // Ajouter le nombre de jours spécifié
    endDate.setDate(now.getDate() + days)

    const reminders = await Reminder.findAll({
      where: {
        assignedToId: ctx.state.user.id,
        isCompleted: false,
        dueDate: {
          $gte: now,
          $lte: endDate,
        },
      },
      include: [{ model: Contact }, { model: Company }],
      order: [["dueDate", "ASC"]],
    })
    ctx.body = reminders
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const createReminder = async (ctx: Context) => {
  try {
    // Ajouter l'ID de l'utilisateur courant comme créateur du rappel
    const data = {
      ...(ctx.request as any).body,
      createdById: ctx.state.user.id,
      tenantId: ctx.state.user.tenantId,
    }

    // Vérifier qu'il y a soit un contactId, soit un companyId (pas obligatoirement les deux)
    if (!data.contactId && !data.companyId) {
      ctx.status = 400
      ctx.body = { error: "Either contactId or companyId is required" }
      return
    }

    const reminder = await Reminder.create(data)

    // Récupérer le rappel créé avec les relations
    const createdReminder = await Reminder.findByPk((reminder as any).id, {
      include: [
        { model: User, as: "createdBy" },
        { model: User, as: "assignedTo" },
        { model: Contact },
        { model: Company },
      ],
    })

    ctx.status = 201
    ctx.body = createdReminder
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const updateReminder = async (ctx: Context) => {
  try {
    const reminder = await Reminder.findByPk(ctx.params.id)

    if (!reminder) {
      ctx.status = 404
      ctx.body = { error: "Reminder not found" }
      return
    }

    // Vérifier que l'utilisateur est le créateur du rappel, l'assigné ou un admin
    if (
      reminder.get("createdById") !== ctx.state.user.id &&
      reminder.get("assignedToId") !== ctx.state.user.id
    ) {
      // Implémenter une vérification de permission ou de rôle ici si nécessaire
      ctx.status = 403
      ctx.body = { error: "You don't have permission to update this reminder" }
      return
    }

    await reminder.update((ctx.request as any).body)

    // Récupérer le rappel mis à jour avec les relations
    const updatedReminder = await Reminder.findByPk((reminder as any).id, {
      include: [
        { model: User, as: "createdBy" },
        { model: User, as: "assignedTo" },
        { model: Contact },
        { model: Company },
      ],
    })

    ctx.body = updatedReminder
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const markReminderAsComplete = async (ctx: Context) => {
  try {
    const reminder = await Reminder.findByPk(ctx.params.id)

    if (!reminder) {
      ctx.status = 404
      ctx.body = { error: "Reminder not found" }
      return
    }

    // Vérifier que l'utilisateur est le créateur du rappel, l'assigné ou un admin
    if (
      reminder.get("createdById") !== ctx.state.user.id &&
      reminder.get("assignedToId") !== ctx.state.user.id
    ) {
      ctx.status = 403
      ctx.body = { error: "You don't have permission to update this reminder" }
      return
    }

    await reminder.update({ isCompleted: true })

    ctx.body = { message: "Reminder marked as complete", id: reminder.get("id") }
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const deleteReminder = async (ctx: Context) => {
  try {
    const reminder = await Reminder.findByPk(ctx.params.id)

    if (!reminder) {
      ctx.status = 404
      ctx.body = { error: "Reminder not found" }
      return
    }

    // Vérifier que l'utilisateur est le créateur du rappel ou un admin
    if (reminder.get("createdById") !== ctx.state.user.id) {
      // Implémenter une vérification de permission ou de rôle ici si nécessaire
      ctx.status = 403
      ctx.body = { error: "You don't have permission to delete this reminder" }
      return
    }

    await reminder.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
