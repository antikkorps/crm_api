import { Context } from "koa"
import { Op } from "sequelize"
import {
  Activity,
  Company,
  Contact,
  ContactSegment,
  Opportunity,
  Quote,
  sequelize,
  Status,
  User,
} from "../models"
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

/**
 * Récupère les statistiques des contacts
 */
export const getContactStats = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Statistiques de base
    const totalContacts = await Contact.count({ where: { tenantId } })

    // Contacts avec email (contacts principaux)
    const contactsWithEmail = await Contact.count({
      where: {
        tenantId,
        email: { [Op.ne]: null },
      },
    })

    // Contacts assignés
    const assignedContacts = await Contact.count({
      where: {
        tenantId,
        assignedToId: { [Op.ne]: null },
      },
    })

    // Contacts par statut
    const contactsByStatus = await Contact.findAll({
      attributes: [
        "statusId",
        [sequelize.fn("COUNT", sequelize.col("Contact.id")), "count"],
      ],
      include: [
        {
          model: Status,
          attributes: ["name", "color"],
          where: { type: "CONTACT" },
        },
      ],
      where: { tenantId },
      group: ["statusId", "Status.id"],
      raw: true,
    })

    // Contacts créés récemment
    const newContactsThisMonth = await Contact.count({
      where: {
        tenantId,
        createdAt: { [Op.gte]: thirtyDaysAgo },
      },
    })

    const newContactsThisWeek = await Contact.count({
      where: {
        tenantId,
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
    })

    // Contacts avec activités récentes
    const contactsWithRecentActivity = await Contact.count({
      include: [
        {
          model: Activity,
          where: {
            tenantId,
            createdAt: { [Op.gte]: thirtyDaysAgo },
          },
          required: true,
        },
      ],
      where: { tenantId },
    })

    // Contacts avec opportunités
    const contactsWithOpportunities = await Contact.count({
      include: [
        {
          model: Opportunity,
          where: { tenantId },
          required: true,
        },
      ],
      where: { tenantId },
    })

    // Contacts avec devis
    const contactsWithQuotes = await Contact.count({
      include: [
        {
          model: Quote,
          where: { tenantId },
          required: true,
        },
      ],
      where: { tenantId },
    })

    // Top utilisateurs assignés
    const topAssignedUsers = await Contact.findAll({
      attributes: [
        "assignedToId",
        [sequelize.fn("COUNT", sequelize.col("Contact.id")), "contactCount"],
      ],
      include: [
        {
          model: User,
          as: "assignedTo",
          attributes: ["firstName", "lastName", "email", "avatarUrl"],
        },
      ],
      where: {
        tenantId,
        assignedToId: { [Op.ne]: null },
      },
      group: ["assignedToId", "assignedTo.id"],
      order: [[sequelize.fn("COUNT", sequelize.col("Contact.id")), "DESC"]],
      limit: 5,
      raw: true,
    })

    // Évolution des contacts (création par mois sur les 6 derniers mois)
    const monthlyGrowth = await Contact.findAll({
      attributes: [
        [
          sequelize.fn("DATE_TRUNC", "month", sequelize.col("Contact.createdAt")),
          "month",
        ],
        [sequelize.fn("COUNT", sequelize.col("Contact.id")), "count"],
      ],
      where: {
        tenantId,
        createdAt: {
          [Op.gte]: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        },
      },
      group: [sequelize.fn("DATE_TRUNC", "month", sequelize.col("Contact.createdAt"))],
      order: [
        [sequelize.fn("DATE_TRUNC", "month", sequelize.col("Contact.createdAt")), "ASC"],
      ],
      raw: true,
    })

    // Contacts par entreprise (top 10)
    const contactsByCompany = await Contact.findAll({
      attributes: [
        "companyId",
        [sequelize.fn("COUNT", sequelize.col("Contact.id")), "contactCount"],
      ],
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["name"],
        },
      ],
      where: {
        tenantId,
        companyId: { [Op.ne]: null },
      },
      group: ["companyId", "company.id"],
      order: [[sequelize.fn("COUNT", sequelize.col("Contact.id")), "DESC"]],
      limit: 10,
      raw: true,
    })

    // Taux de conversion (contacts avec opportunités gagnées)
    const wonStatuses = await Status.findAll({
      attributes: ["id"],
      where: {
        type: "OPPORTUNITY",
        name: { [Op.iLike]: "%won%" },
      },
    })

    const wonStatusIds = wonStatuses.map((status) => status.get("id") as string)

    const contactsWithWonOpportunities =
      wonStatusIds.length > 0
        ? await Contact.count({
            include: [
              {
                model: Opportunity,
                where: {
                  tenantId,
                  statusId: { [Op.in]: wonStatusIds },
                },
                required: true,
              },
            ],
            where: { tenantId },
          })
        : 0

    const conversionRate =
      totalContacts > 0
        ? Math.round((contactsWithWonOpportunities / totalContacts) * 100 * 100) / 100
        : 0

    ctx.body = {
      overview: {
        totalContacts,
        contactsWithEmail,
        assignedContacts,
        newContactsThisMonth,
        newContactsThisWeek,
        contactsWithRecentActivity,
        contactsWithOpportunities,
        contactsWithQuotes,
        conversionRate,
      },
      byStatus: contactsByStatus,
      topAssignedUsers,
      monthlyGrowth,
      contactsByCompany,
      engagement: {
        withRecentActivity: contactsWithRecentActivity,
        withOpportunities: contactsWithOpportunities,
        withQuotes: contactsWithQuotes,
        withWonOpportunities: contactsWithWonOpportunities,
      },
    }
  } catch (error: unknown) {
    throw error
  }
}

export const searchAvailableContacts = async (ctx: Context) => {
  try {
    const { q, name, search, excludeSegment, excludeFromSegment } = ctx.query
    const tenantId = ctx.state.user.tenantId

    // Accepter différents paramètres pour la recherche (q, name, search)
    const query = q || name || search
    const segmentToExclude = excludeSegment || excludeFromSegment

    let whereCondition: any = { tenantId }

    // Si une requête de recherche est fournie
    if (query && typeof query === "string" && query.trim().length > 0) {
      whereCondition[Op.or] = [
        { firstName: { [Op.iLike]: `%${query}%` } },
        { lastName: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } },
      ]
    }

    // Si on veut exclure les contacts d'un segment spécifique
    if (segmentToExclude) {
      const contactsInSegment = await ContactSegment.findAll({
        where: { segmentId: segmentToExclude },
        attributes: ["contactId"],
      })
      
      const excludedContactIds = contactsInSegment.map((cs: any) => cs.contactId)
      
      if (excludedContactIds.length > 0) {
        whereCondition.id = { [Op.notIn]: excludedContactIds }
      }
    }

    const result = await paginatedQuery(Contact, ctx, {
      where: whereCondition,
      include: [
        { model: Company, as: "company" },
        { model: Status },
        { model: User, as: "assignedTo" },
      ],
      order: [["firstName", "ASC"], ["lastName", "ASC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}
