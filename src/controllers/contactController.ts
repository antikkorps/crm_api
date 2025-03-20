import { Context } from "koa"
import { Company, Contact, Status, User } from "../models"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { paginatedQuery } from "../utils/pagination"

export const getAllContacts = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Contact, ctx, {
      include: [
        { model: Company, as: "company" },
        { model: Status },
        { model: User, as: "assignedTo" },
      ],
      where: { tenantId: ctx.state.user.tenantId },
    })

    ctx.body = result
  } catch (error: unknown) {
    // L'erreur sera gérée par le middleware d'erreur
    throw error
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
      throw new NotFoundError(`Contact with ID ${ctx.params.id} not found`)
    }
    ctx.body = contact
  } catch (error: unknown) {
    // L'erreur sera gérée par le middleware d'erreur
    throw error
  }
}

export const getContactsByTenant = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Contact, ctx, {
      where: {
        tenantId: ctx.params.tenantId,
      },
      include: [
        { model: Company, as: "company" },
        { model: Status },
        { model: User, as: "assignedTo" },
      ],
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getContactsByCompany = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Contact, ctx, {
      where: {
        companyId: ctx.params.companyId,
      },
      include: [{ model: Status }, { model: User, as: "assignedTo" }],
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const createContact = async (ctx: Context) => {
  try {
    const contactData = (ctx.request as any).body

    // Validation des champs obligatoires
    if (!contactData.firstName || !contactData.lastName) {
      throw new BadRequestError(
        "First name and last name are required",
        "MISSING_REQUIRED_FIELDS",
        {
          missing: ["firstName", "lastName"].filter((field) => !contactData[field]),
        }
      )
    }

    const contact = await Contact.create(contactData)
    ctx.status = 201
    ctx.body = contact
  } catch (error: unknown) {
    // L'erreur sera gérée par le middleware d'erreur
    throw error
  }
}

export const updateContact = async (ctx: Context) => {
  try {
    const contact = await Contact.findByPk(ctx.params.id)
    if (!contact) {
      throw new NotFoundError(`Contact with ID ${ctx.params.id} not found`)
    }

    await contact.update((ctx.request as any).body)
    ctx.body = contact
  } catch (error: unknown) {
    // L'erreur sera gérée par le middleware d'erreur
    throw error
  }
}

export const deleteContact = async (ctx: Context) => {
  try {
    const contact = await Contact.findByPk(ctx.params.id)
    if (!contact) {
      throw new NotFoundError(`Contact with ID ${ctx.params.id} not found`)
    }

    await contact.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    // L'erreur sera gérée par le middleware d'erreur
    throw error
  }
}
