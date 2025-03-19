import { Context } from "koa"
import { Company, Contact, Status, User } from "../models"

export const getAllContacts = async (ctx: Context) => {
  try {
    const contacts = await Contact.findAll({
      include: [
        { model: Company, as: "company" },
        { model: Status },
        { model: User, as: "assignedTo" },
      ],
    })
    ctx.body = contacts
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getContactById = async (ctx: Context) => {
  try {
    const contact = await Contact.findByPk(ctx.params.id, {
      include: [
        { model: Company, as: "company" },
        { model: Status },
        { model: User, as: "assignedTo" },
      ],
    })
    if (!contact) {
      ctx.status = 404
      ctx.body = { error: "Contact not found" }
      return
    }
    ctx.body = contact
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getContactsByTenant = async (ctx: Context) => {
  try {
    const contacts = await Contact.findAll({
      where: {
        tenantId: ctx.params.tenantId,
      },
      include: [
        { model: Company, as: "company" },
        { model: Status },
        { model: User, as: "assignedTo" },
      ],
    })
    ctx.body = contacts
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getContactsByCompany = async (ctx: Context) => {
  try {
    const contacts = await Contact.findAll({
      where: {
        companyId: ctx.params.companyId,
      },
      include: [{ model: Status }, { model: User, as: "assignedTo" }],
    })
    ctx.body = contacts
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const createContact = async (ctx: Context) => {
  try {
    const contact = await Contact.create((ctx.request as any).body)
    ctx.status = 201
    ctx.body = contact
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const updateContact = async (ctx: Context) => {
  try {
    const contact = await Contact.findByPk(ctx.params.id)
    if (!contact) {
      ctx.status = 404
      ctx.body = { error: "Contact not found" }
      return
    }
    await contact.update((ctx.request as any).body)
    ctx.body = contact
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const deleteContact = async (ctx: Context) => {
  try {
    const contact = await Contact.findByPk(ctx.params.id)
    if (!contact) {
      ctx.status = 404
      ctx.body = { error: "Contact not found" }
      return
    }
    await contact.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
