import { Context } from "koa"
import { Company, Contact, Note, User } from "../models"
import { paginatedQuery } from "../utils/pagination"

export const getAllNotes = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Note, ctx, {
      include: [{ model: User, as: "createdBy" }, { model: Contact }, { model: Company }],
      where: { tenantId: ctx.state.user.tenantId },
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getNoteById = async (ctx: Context) => {
  try {
    const note = await Note.findByPk(ctx.params.id, {
      include: [{ model: User, as: "createdBy" }, { model: Contact }, { model: Company }],
    })
    if (!note) {
      ctx.status = 404
      ctx.body = { error: "Note not found" }
      return
    }
    ctx.body = note
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getNotesByContact = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Note, ctx, {
      where: {
        contactId: ctx.params.contactId,
      },
      include: [{ model: User, as: "createdBy" }],
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getNotesByCompany = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Note, ctx, {
      where: {
        companyId: ctx.params.companyId,
      },
      include: [{ model: User, as: "createdBy" }],
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getNotesByTenant = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Note, ctx, {
      where: {
        tenantId: ctx.params.tenantId,
      },
      include: [{ model: User, as: "createdBy" }, { model: Contact }, { model: Company }],
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const createNote = async (ctx: Context) => {
  try {
    // Ajouter l'ID de l'utilisateur courant comme créateur de la note
    const data = {
      ...(ctx.request as any).body,
      createdById: ctx.state.user.id,
      tenantId: ctx.state.user.tenantId,
    }

    // Vérifier qu'il y a soit un contactId, soit un companyId (pas les deux)
    if (!data.contactId && !data.companyId) {
      ctx.status = 400
      ctx.body = { error: "Either contactId or companyId is required" }
      return
    }

    if (data.contactId && data.companyId) {
      ctx.status = 400
      ctx.body = {
        error: "A note cannot be associated with both a contact and a company",
      }
      return
    }

    const note = await Note.create(data)

    // Récupérer la note créée avec les relations
    const createdNote = await Note.findByPk((note as any).id, {
      include: [{ model: User, as: "createdBy" }],
    })

    ctx.status = 201
    ctx.body = createdNote
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const updateNote = async (ctx: Context) => {
  try {
    const note = await Note.findByPk(ctx.params.id)

    if (!note) {
      ctx.status = 404
      ctx.body = { error: "Note not found" }
      return
    }

    // Vérifier que l'utilisateur est le créateur de la note ou un admin
    if (note.get("createdById") !== ctx.state.user.id) {
      // Implémenter une vérification de permission ou de rôle ici si nécessaire
      ctx.status = 403
      ctx.body = { error: "You don't have permission to update this note" }
      return
    }

    // Mise à jour du contenu uniquement
    await note.update({
      content: (ctx.request as any).body.content,
    })

    // Récupérer la note mise à jour avec les relations
    const updatedNote = await Note.findByPk((note as any).id, {
      include: [{ model: User, as: "createdBy" }],
    })

    ctx.body = updatedNote
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const deleteNote = async (ctx: Context) => {
  try {
    const note = await Note.findByPk(ctx.params.id)

    if (!note) {
      ctx.status = 404
      ctx.body = { error: "Note not found" }
      return
    }

    // Vérifier que l'utilisateur est le créateur de la note ou un admin
    if (note.get("createdById") !== ctx.state.user.id) {
      // Implémenter une vérification de permission ou de rôle ici si nécessaire
      ctx.status = 403
      ctx.body = { error: "You don't have permission to delete this note" }
      return
    }

    await note.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
