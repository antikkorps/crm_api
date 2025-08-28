import { Context } from "koa"
import { Op, QueryTypes, WhereOptions } from "sequelize"
import { Contact, ContactSegment, Segment, User, sequelize, Company } from "../models"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { paginatedQuery } from "../utils/pagination"
import { updateSegmentMembers } from "../utils/segmentRuleEngine"

/**
 * Exécute des règles de segment pour prévisualisation
 */
const executeRulesForPreview = async (tenantId: string, rules: any): Promise<any[]> => {
  const buildWhereCondition = (rule: any): WhereOptions => {
    const { field, operator, value } = rule
    
    switch (operator) {
      case "equals":
        return { [field]: value }
      case "notEquals":
        return { [field]: { [Op.ne]: value } }
      case "contains":
        return { [field]: { [Op.iLike]: `%${value}%` } }
      case "notContains":
        return { [field]: { [Op.notILike]: `%${value}%` } }
      case "startsWith":
        return { [field]: { [Op.iLike]: `${value}%` } }
      case "endsWith":
        return { [field]: { [Op.iLike]: `%${value}` } }
      default:
        throw new BadRequestError(`Unsupported operator: ${operator}`)
    }
  }

  const buildComplexCondition = (complexRule: any): WhereOptions => {
    const { operator, conditions } = complexRule
    
    if (!Array.isArray(conditions) || conditions.length === 0) {
      throw new BadRequestError("Complex rule must have conditions array")
    }

    const whereConditions = conditions.map((condition: any) => {
      if ("field" in condition) {
        return buildWhereCondition(condition)
      } else if ("operator" in condition && "conditions" in condition) {
        return buildComplexCondition(condition)
      } else {
        throw new BadRequestError("Invalid condition format")
      }
    })

    if (operator === "AND") {
      return { [Op.and]: whereConditions }
    } else if (operator === "OR") {
      return { [Op.or]: whereConditions }
    } else {
      throw new BadRequestError(`Unsupported complex operator: ${operator}`)
    }
  }

  let whereCondition: WhereOptions
  if ("field" in rules) {
    whereCondition = buildWhereCondition(rules)
  } else if ("operator" in rules && "conditions" in rules) {
    whereCondition = buildComplexCondition(rules)
  } else {
    throw new BadRequestError("Invalid rule format")
  }

  whereCondition = {
    ...whereCondition,
    tenantId
  }

  const contacts = await Contact.findAll({
    where: whereCondition,
    include: [
      {
        model: User,
        as: "assignedTo",
        attributes: ["id", "firstName", "lastName"]
      },
      {
        model: Company,
        as: "company",
        attributes: ["id", "name"]
      }
    ],
    attributes: ["id", "firstName", "lastName", "email"],
    limit: 1000,
    order: [["createdAt", "DESC"]]
  })

  return contacts
}

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

    const rules = segment.get("rules")
    if (!rules) {
      throw new BadRequestError("Segment has no rules to evaluate")
    }

    // Validation basique des règles
    if (typeof rules !== "object" || rules === null) {
      throw new BadRequestError("Invalid rules format: rules must be an object")
    }

    // Vérifier si c'est une condition simple
    if ("field" in rules) {
      const simpleRule = rules as any
      if (!simpleRule.field || !simpleRule.operator) {
        throw new BadRequestError("Invalid simple rule: field and operator are required")
      }
    }
    // Vérifier si c'est une condition complexe
    else if ("operator" in rules && "conditions" in rules) {
      const complexRule = rules as any
      if (
        !complexRule.operator ||
        !Array.isArray(complexRule.conditions) ||
        complexRule.conditions.length === 0
      ) {
        throw new BadRequestError(
          "Invalid complex rule: operator and non-empty conditions array are required"
        )
      }
    } else {
      throw new BadRequestError(
        "Invalid rule format: must be either a simple condition or a complex condition"
      )
    }

    const result = await updateSegmentMembers(
      segment.get("id") as string,
      ctx.state.user.tenantId,
      rules as any
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

/**
 * Récupère les statistiques des segments
 */
export const getSegmentStats = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Statistiques de base
    const totalSegments = await Segment.count({ where: { tenantId } })

    // Segments dynamiques vs manuels
    const dynamicSegments = await Segment.count({
      where: {
        tenantId,
        isDynamic: true,
      },
    })

    const manualSegments = totalSegments - dynamicSegments

    // Total des contacts dans tous les segments
    const totalContactsInSegments = await ContactSegment.count({
      include: [
        {
          model: Segment,
          where: { tenantId },
          required: true,
        },
      ],
    })

    // Segments les plus populaires (par nombre de contacts)
    const topSegments = await Segment.findAll({
      attributes: [
        "id",
        "name",
        "description",
        "isDynamic",
        "contactCount",
        "lastEvaluatedAt",
      ],
      where: { tenantId },
      order: [["contactCount", "DESC"]],
      limit: 10,
    })

    // Segments récemment évalués
    const recentlyEvaluatedSegments = await Segment.count({
      where: {
        tenantId,
        lastEvaluatedAt: { [Op.gte]: thirtyDaysAgo },
      },
    })

    // Segments avec le plus d'activité récente
    const segmentsWithRecentActivity = await sequelize.query(
      `
      SELECT 
        s.id,
        s.name,
        s."contactCount",
        COUNT(a.id) as "activityCount"
      FROM segments s
      INNER JOIN contact_segments cs ON s.id = cs."segmentId"
      INNER JOIN contacts c ON cs."contactId" = c.id
      INNER JOIN activities a ON c.id = a."contactId"
      WHERE s."tenantId" = :tenantId 
        AND a."tenantId" = :tenantId 
        AND a."createdAt" >= :thirtyDaysAgo
      GROUP BY s.id, s.name, s."contactCount"
      ORDER BY COUNT(a.id) DESC
      LIMIT 5
    `,
      {
        replacements: { tenantId, thirtyDaysAgo },
        type: QueryTypes.SELECT,
      }
    )

    // Segments avec le plus d'opportunités
    const segmentsWithOpportunities = await sequelize.query(
      `
      SELECT 
        s.id,
        s.name,
        s."contactCount",
        COUNT(o.id) as "opportunityCount",
        COALESCE(SUM(o.value), 0) as "totalValue"
      FROM segments s
      INNER JOIN contact_segments cs ON s.id = cs."segmentId"
      INNER JOIN contacts c ON cs."contactId" = c.id
      INNER JOIN opportunities o ON c.id = o."contactId"
      WHERE s."tenantId" = :tenantId 
        AND o."tenantId" = :tenantId
      GROUP BY s.id, s.name, s."contactCount"
      ORDER BY COALESCE(SUM(o.value), 0) DESC
      LIMIT 5
    `,
      {
        replacements: { tenantId },
        type: QueryTypes.SELECT,
      }
    )

    // Segments avec le plus de devis
    const segmentsWithQuotes = await sequelize.query(
      `
      SELECT 
        s.id,
        s.name,
        s."contactCount",
        COUNT(q.id) as "quoteCount",
        COALESCE(SUM(q."totalAmount"), 0) as "totalAmount"
      FROM segments s
      INNER JOIN contact_segments cs ON s.id = cs."segmentId"
      INNER JOIN contacts c ON cs."contactId" = c.id
      INNER JOIN quotes q ON c.id = q."contactId"
      WHERE s."tenantId" = :tenantId 
        AND q."tenantId" = :tenantId
      GROUP BY s.id, s.name, s."contactCount"
      ORDER BY COALESCE(SUM(q."totalAmount"), 0) DESC
      LIMIT 5
    `,
      {
        replacements: { tenantId },
        type: QueryTypes.SELECT,
      }
    )

    // Évolution des segments (création par mois)
    const monthlySegmentGrowth = await Segment.findAll({
      attributes: [
        [
          sequelize.fn("DATE_TRUNC", "month", sequelize.col("Segment.createdAt")),
          "month",
        ],
        [sequelize.fn("COUNT", sequelize.col("Segment.id")), "count"],
      ],
      where: {
        tenantId,
        createdAt: {
          [Op.gte]: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        },
      },
      group: [sequelize.fn("DATE_TRUNC", "month", sequelize.col("Segment.createdAt"))],
      order: [
        [sequelize.fn("DATE_TRUNC", "month", sequelize.col("Segment.createdAt")), "ASC"],
      ],
      raw: true,
    })

    // Taux d'engagement des segments (contacts avec activités récentes)
    const segmentEngagement = await sequelize.query(
      `
      SELECT 
        s.id,
        s.name,
        s."contactCount",
        COUNT(DISTINCT c.id) as "engagedContacts"
      FROM segments s
      INNER JOIN contact_segments cs ON s.id = cs."segmentId"
      INNER JOIN contacts c ON cs."contactId" = c.id
      INNER JOIN activities a ON c.id = a."contactId"
      WHERE s."tenantId" = :tenantId 
        AND a."tenantId" = :tenantId 
        AND a."createdAt" >= :thirtyDaysAgo
      GROUP BY s.id, s.name, s."contactCount"
      ORDER BY COUNT(DISTINCT c.id) DESC
      LIMIT 10
    `,
      {
        replacements: { tenantId, thirtyDaysAgo },
        type: QueryTypes.SELECT,
      }
    )

    // Calcul des taux d'engagement
    const engagementRates = segmentEngagement.map((segment: any) => ({
      ...segment,
      engagementRate:
        segment.contactCount > 0
          ? Math.round((segment.engagedContacts / segment.contactCount) * 100 * 100) / 100
          : 0,
    }))

    // Segments qui nécessitent une évaluation (plus de 7 jours)
    const segmentsNeedingEvaluation = await Segment.count({
      where: {
        tenantId,
        isDynamic: true,
        [Op.or]: [
          {
            lastEvaluatedAt: {
              [Op.lt]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          { lastEvaluatedAt: null },
        ],
      },
    })

    ctx.body = {
      overview: {
        totalSegments,
        dynamicSegments,
        manualSegments,
        totalContactsInSegments,
        recentlyEvaluatedSegments,
        segmentsNeedingEvaluation,
      },
      topSegments,
      segmentsWithRecentActivity,
      segmentsWithOpportunities,
      segmentsWithQuotes,
      monthlySegmentGrowth,
      engagementRates,
      performance: {
        averageContactsPerSegment:
          totalSegments > 0
            ? Math.round((totalContactsInSegments / totalSegments) * 100) / 100
            : 0,
        segmentsWithActivity: segmentsWithRecentActivity.length,
        segmentsWithOpportunities: segmentsWithOpportunities.length,
        segmentsWithQuotes: segmentsWithQuotes.length,
      },
    }
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Prévisualise les résultats d'une règle de segment
 */
export const previewSegmentRules = async (ctx: Context) => {
  try {
    const { rules } = (ctx.request as any).body

    if (!rules) {
      throw new BadRequestError("Rules are required")
    }

    // LE PROBLÈME EST ICI: rules est un array, pas un objet
    // Le frontend envoie { rules: [rule] }, donc rules[0] est l'objet rule

    let ruleToProcess: any

    if (Array.isArray(rules)) {
      if (rules.length === 0) {
        ctx.body = {
          contactCount: 0,
          sampleContacts: [],
          isValid: false,
          errors: ["No rules provided"]
        }
        return
      } else if (rules.length === 1) {
        // Un seul rule dans l'array
        ruleToProcess = rules[0]
      } else {
        // Plusieurs rules, on les combine avec AND
        ruleToProcess = {
          operator: "AND",
          conditions: rules
        }
      }
    } else {
      // rules est déjà un objet (rétrocompatibilité)
      ruleToProcess = rules
    }

    // Validation basique des règles (utilise ruleToProcess au lieu de rules)
    if (typeof ruleToProcess !== "object" || ruleToProcess === null) {
      throw new BadRequestError("Invalid rules format: rules must be an object")
    }

    // Vérifier si c'est une condition simple
    if ("field" in ruleToProcess) {
      const simpleRule = ruleToProcess as any
      if (!simpleRule.field || !simpleRule.operator) {
        ctx.body = {
          contactCount: 0,
          sampleContacts: [],
          isValid: false,
          errors: ["Invalid simple rule: field and operator are required"]
        }
        return
      }
    }
    // Vérifier si c'est une condition complexe
    else if ("operator" in ruleToProcess && "conditions" in ruleToProcess) {
      const complexRule = ruleToProcess as any
      if (
        !complexRule.operator ||
        !Array.isArray(complexRule.conditions) ||
        complexRule.conditions.length === 0
      ) {
        ctx.body = {
          contactCount: 0,
          sampleContacts: [],
          isValid: false,
          errors: ["Invalid complex rule: operator and non-empty conditions array are required"]
        }
        return
      }
    } else {
      ctx.body = {
        contactCount: 0,
        sampleContacts: [],
        isValid: false,
        errors: ["Invalid rule format: must be either a simple condition or a complex condition"]
      }
      return
    }

    // Exécuter les règles pour la prévisualisation (utilise ruleToProcess)
    const contacts = await executeRulesForPreview(ctx.state.user.tenantId, ruleToProcess)
    
    // Limiter les échantillons à 5 contacts
    const sampleContacts = contacts.slice(0, 5).map((contact: any) => ({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      company: contact.company ? { name: contact.company.name } : undefined
    }))

    ctx.body = {
      contactCount: contacts.length,
      sampleContacts,
      isValid: true
    }
  } catch (error: any) {
    // En cas d'erreur, retourner un résultat invalide avec le message d'erreur
    ctx.body = {
      contactCount: 0,
      sampleContacts: [],
      isValid: false,
      errors: [error.message || "Unknown error occurred"]
    }
  }
}
