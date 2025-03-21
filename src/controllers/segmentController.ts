import { Context } from "koa"
import { Op } from "sequelize"
import { Contact, ContactSegment, Segment, User } from "../models"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { paginatedQuery } from "../utils/pagination"
import { updateSegmentMembers } from "../utils/segmentRuleEngine"

/**
 * Récupère tous les segments d'un tenant
 */
export const getAllSegments = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Segment, ctx, {
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: { exclude: ["password"] }, // Exclure le mot de passe
        },
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
 * Récupère un segment par son ID
 */
export const getSegmentById = async (ctx: Context) => {
  try {
    const segment = await Segment.findByPk(ctx.params.id, {
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: { exclude: ["password"] }, // Exclure le mot de passe
        },
      ],
    })

    if (!segment) {
      throw new NotFoundError(`Segment with ID ${ctx.params.id} not found`)
    }

    ctx.body = segment
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère les contacts d'un segment
 */
export const getSegmentContacts = async (ctx: Context) => {
  try {
    const segment = await Segment.findByPk(ctx.params.id)
    if (!segment) {
      throw new NotFoundError(`Segment with ID ${ctx.params.id} not found`)
    }

    // Récupérer les IDs des contacts du segment
    const contactSegments = await ContactSegment.findAll({
      where: { segmentId: ctx.params.id },
      attributes: ["contactId"],
    })

    const contactIds = contactSegments.map((cs: any) => cs.contactId)

    // Si le segment est vide, retourner un résultat vide directement
    if (contactIds.length === 0) {
      ctx.body = {
        items: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          itemsPerPage: parseInt(ctx.query.limit as string) || 10,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }
      return
    }

    // Récupérer les contacts paginés
    const result = await paginatedQuery(Contact, ctx, {
      where: {
        id: { [Op.in]: contactIds },
        tenantId: ctx.state.user.tenantId,
      },
      include: [{ model: User, as: "assignedTo" }],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Crée un nouveau segment
 */
export const createSegment = async (ctx: Context) => {
  try {
    const segmentData = {
      ...(ctx.request as any).body,
      createdById: ctx.state.user.id,
      tenantId: ctx.state.user.tenantId,
    }

    // Valider que le nom n'est pas vide
    if (!segmentData.name || segmentData.name.trim() === "") {
      throw new BadRequestError("Segment name is required")
    }

    // Créer le segment
    const segment = await Segment.create(segmentData)

    // Si le segment est dynamique et a des règles, mettre à jour ses membres
    if (segment.get("isDynamic") && segment.get("rules")) {
      await updateSegmentMembers(
        segment.get("id") as string,
        ctx.state.user.tenantId,
        segment.get("rules") as any
      )
    }

    // Récupérer le segment créé avec ses relations
    const createdSegment = await Segment.findByPk((segment as any).id, {
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: { exclude: ["password"] }, // Exclure le mot de passe
        },
      ],
    })

    ctx.status = 201
    ctx.body = createdSegment
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Met à jour un segment
 */
export const updateSegment = async (ctx: Context) => {
  try {
    const segment = await Segment.findByPk(ctx.params.id)

    if (!segment) {
      throw new NotFoundError(`Segment with ID ${ctx.params.id} not found`)
    }

    const updateData = (ctx.request as any).body

    // Valider que le nom n'est pas vide s'il est fourni
    if (
      updateData.name !== undefined &&
      (!updateData.name || updateData.name.trim() === "")
    ) {
      throw new BadRequestError("Segment name cannot be empty")
    }

    await segment.update(updateData)

    // Si le segment est dynamique et a des règles, mettre à jour ses membres
    if (segment.get("isDynamic") && segment.get("rules")) {
      await updateSegmentMembers(
        segment.get("id") as string,
        ctx.state.user.tenantId,
        segment.get("rules") as any
      )
    }

    // Récupérer le segment mis à jour avec ses relations
    const updatedSegment = await Segment.findByPk(ctx.params.id, {
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: { exclude: ["password"] }, // Exclure le mot de passe
        },
      ],
    })

    ctx.body = updatedSegment
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Supprime un segment
 */
export const deleteSegment = async (ctx: Context) => {
  try {
    const segment = await Segment.findByPk(ctx.params.id)

    if (!segment) {
      throw new NotFoundError(`Segment with ID ${ctx.params.id} not found`)
    }

    // Supprimer d'abord les relations contact-segment
    await ContactSegment.destroy({
      where: { segmentId: ctx.params.id },
    })

    // Puis supprimer le segment lui-même
    await segment.destroy()

    ctx.status = 204
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Ré-évalue un segment pour mettre à jour ses membres
 */
export const evaluateSegment = async (ctx: Context) => {
  try {
    const segment = await Segment.findByPk(ctx.params.id)

    if (!segment) {
      throw new NotFoundError(`Segment with ID ${ctx.params.id} not found`)
    }

    if (!segment.get("isDynamic")) {
      throw new BadRequestError("Cannot evaluate a non-dynamic segment")
    }

    if (!segment.get("rules")) {
      throw new BadRequestError("Segment has no rules to evaluate")
    }

    const result = await updateSegmentMembers(
      segment.get("id") as string,
      ctx.state.user.tenantId,
      segment.get("rules") as any
    )

    ctx.body = {
      message: "Segment evaluated successfully",
      changes: result,
    }
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Ajoute manuellement un contact à un segment
 */
export const addContactToSegment = async (ctx: Context) => {
  try {
    const { segmentId, contactId } = ctx.params

    // Vérifier que le segment existe
    const segment = await Segment.findByPk(segmentId)
    if (!segment) {
      throw new NotFoundError(`Segment with ID ${segmentId} not found`)
    }

    // Vérifier que le contact existe
    const contact = await Contact.findByPk(contactId)
    if (!contact) {
      throw new NotFoundError(`Contact with ID ${contactId} not found`)
    }

    // Vérifier si la relation existe déjà
    const existingRelation = await ContactSegment.findOne({
      where: {
        segmentId,
        contactId,
      },
    })

    if (existingRelation) {
      // Si elle existe mais n'est pas manuelle, la mettre à jour
      if (!existingRelation.get("isManuallyAdded")) {
        await existingRelation.update({ isManuallyAdded: true })
        ctx.body = { message: "Contact is now manually added to the segment" }
      } else {
        ctx.body = { message: "Contact is already in the segment" }
      }
    } else {
      // Créer la relation
      await ContactSegment.create({
        segmentId,
        contactId,
        isManuallyAdded: true,
        addedAt: new Date(),
      })

      // Mettre à jour le compteur du segment
      await segment.increment("contactCount")

      ctx.status = 201
      ctx.body = { message: "Contact added to segment" }
    }
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Supprime un contact d'un segment
 */
export const removeContactFromSegment = async (ctx: Context) => {
  try {
    const { segmentId, contactId } = ctx.params

    // Vérifier que le segment existe
    const segment = await Segment.findByPk(segmentId)
    if (!segment) {
      throw new NotFoundError(`Segment with ID ${segmentId} not found`)
    }

    // Vérifier que le contact existe
    const contact = await Contact.findByPk(contactId)
    if (!contact) {
      throw new NotFoundError(`Contact with ID ${contactId} not found`)
    }

    // Vérifier si la relation existe
    const existingRelation = await ContactSegment.findOne({
      where: {
        segmentId,
        contactId,
      },
    })

    if (!existingRelation) {
      throw new NotFoundError("Contact is not in this segment")
    }

    // Supprimer la relation
    await existingRelation.destroy()

    // Mettre à jour le compteur du segment
    if ((segment.get("contactCount") as number) > 0) {
      await segment.decrement("contactCount")
    }

    ctx.status = 204
  } catch (error: unknown) {
    throw error
  }
}
