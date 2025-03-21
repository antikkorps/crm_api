import { Context } from "koa"
import { Company, Contact, Status, User } from "../models"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { emitEvent, EventType } from "../utils/eventEmitter"
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

    // Émettre un événement de création de contact
    emitEvent(EventType.CONTACT_CREATED, {
      tenantId: contact.get("tenantId") as string,
      entityId: contact.get("id") as string,
      entityType: "contact",
      userId: ctx.state.user.id,
      timestamp: new Date(),
      data: contact.toJSON(),
    })

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

    // Stocker l'état précédent pour les événements
    const previousData = contact.toJSON()
    const updateData = (ctx.request as any).body

    await contact.update(updateData)

    // Émettre un événement de mise à jour
    emitEvent(EventType.CONTACT_UPDATED, {
      tenantId: contact.get("tenantId") as string,
      entityId: contact.get("id") as string,
      entityType: "contact",
      userId: ctx.state.user.id,
      timestamp: new Date(),
      data: contact.toJSON(),
      previousData,
    })

    // Si le statut a changé, émettre un événement spécifique de changement de statut
    if (updateData.statusId && previousData.statusId !== updateData.statusId) {
      emitEvent(EventType.CONTACT_STATUS_CHANGED, {
        tenantId: contact.get("tenantId") as string,
        entityId: contact.get("id") as string,
        entityType: "contact",
        userId: ctx.state.user.id,
        timestamp: new Date(),
        data: contact.toJSON(),
        previousData,
      })
    }

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

    // Stocker les données avant suppression
    const contactData = contact.toJSON()

    await contact.destroy()

    // Émettre un événement de suppression
    emitEvent(EventType.CONTACT_DELETED, {
      tenantId: contactData.tenantId,
      entityId: contactData.id,
      entityType: "contact",
      userId: ctx.state.user.id,
      timestamp: new Date(),
      data: contactData,
    })

    ctx.status = 204
  } catch (error: unknown) {
    // L'erreur sera gérée par le middleware d'erreur
    throw error
  }
}
