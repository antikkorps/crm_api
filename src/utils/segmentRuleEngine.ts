import { Op } from "sequelize"
import { Contact } from "../models"

/**
 * Types pour le moteur de règles de segmentation
 */
export interface SimpleCondition {
  field: string
  operator:
    | "equals"
    | "notEquals"
    | "contains"
    | "notContains"
    | "startsWith"
    | "endsWith"
    | "greaterThan"
    | "lessThan"
  value: any
}

export interface ComplexCondition {
  operator: "AND" | "OR"
  conditions: (SimpleCondition | ComplexCondition)[]
}

export type SegmentRule = SimpleCondition | ComplexCondition

/**
 * Convertit une règle de segmentation en condition Sequelize pour les requêtes
 */
export function buildSequelizeQuery(rule: SegmentRule): any {
  // Cas de base : une condition simple
  if ("field" in rule) {
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
      case "greaterThan":
        return { [field]: { [Op.gt]: value } }
      case "lessThan":
        return { [field]: { [Op.lt]: value } }
      default:
        throw new Error(`Unsupported operator: ${operator}`)
    }
  }

  // Cas récursif : un groupe AND ou OR
  const { operator, conditions } = rule
  const clauseOperator = operator === "AND" ? Op.and : Op.or

  return {
    [clauseOperator]: conditions.map((condition) => buildSequelizeQuery(condition)),
  }
}

/**
 * Évalue une règle pour un contact donné
 */
export function evaluateRule(contact: any, rule: SegmentRule): boolean {
  // Cas de base : une condition simple
  if ("field" in rule) {
    const { field, operator, value } = rule
    const contactValue = contact[field]

    if (contactValue === undefined || contactValue === null) {
      return false
    }

    switch (operator) {
      case "equals":
        return contactValue === value
      case "notEquals":
        return contactValue !== value
      case "contains":
        return String(contactValue).toLowerCase().includes(String(value).toLowerCase())
      case "notContains":
        return !String(contactValue).toLowerCase().includes(String(value).toLowerCase())
      case "startsWith":
        return String(contactValue).toLowerCase().startsWith(String(value).toLowerCase())
      case "endsWith":
        return String(contactValue).toLowerCase().endsWith(String(value).toLowerCase())
      case "greaterThan":
        return contactValue > value
      case "lessThan":
        return contactValue < value
      default:
        return false
    }
  }

  // Cas récursif : un groupe AND ou OR
  const { operator, conditions } = rule

  if (operator === "AND") {
    return conditions.every((condition) => evaluateRule(contact, condition))
  } else {
    return conditions.some((condition) => evaluateRule(contact, condition))
  }
}

/**
 * Trouve les contacts qui correspondent aux règles du segment
 */
export async function findMatchingContacts(
  tenantId: string,
  rule: SegmentRule | null
): Promise<Array<InstanceType<typeof Contact>>> {
  if (!rule) {
    return []
  }

  try {
    // Transformer la règle en requête Sequelize
    const whereClause = {
      tenantId,
      ...buildSequelizeQuery(rule),
    }

    // Exécuter la requête
    const contacts = await Contact.findAll({
      where: whereClause,
      attributes: ["id"], // Ne récupérer que les IDs pour optimisation
    })

    return contacts
  } catch (error) {
    console.error("Error evaluating segment rule:", error)
    throw error
  }
}

/**
 * Met à jour les membres d'un segment en fonction de ses règles
 */
export async function updateSegmentMembers(
  segmentId: string,
  tenantId: string,
  rule: SegmentRule | null
) {
  if (!rule) {
    return { added: 0, removed: 0 }
  }

  try {
    const { ContactSegment, Segment } = require("../models")

    // Trouver les contacts correspondant aux règles
    const matchingContacts = await findMatchingContacts(tenantId, rule)
    const matchingContactIds = matchingContacts.map((c) => c.get("id"))

    // Récupérer les contacts actuellement dans le segment
    const currentMembers = await ContactSegment.findAll({
      where: { segmentId },
      attributes: ["contactId", "isManuallyAdded"],
    })

    // Séparer les membres ajoutés manuellement (à conserver)
    const manuallyAddedIds = currentMembers
      .filter((m: any) => m.isManuallyAdded)
      .map((m: any) => m.contactId)

    // Les membres actuellement dans le segment (non ajoutés manuellement)
    const currentAutoIds = currentMembers
      .filter((m: any) => !m.isManuallyAdded)
      .map((m: any) => m.contactId)

    // Contacts à ajouter (nouveaux selon les règles)
    const contactsToAdd = matchingContactIds.filter(
      (id) => !currentAutoIds.includes(id) && !manuallyAddedIds.includes(id)
    )

    // Contacts à supprimer (ne correspondent plus aux règles et n'ont pas été ajoutés manuellement)
    const contactsToRemove = currentAutoIds.filter(
      (id: string) => !matchingContactIds.includes(id)
    )

    // Ajouter les nouveaux contacts au segment
    if (contactsToAdd.length > 0) {
      await ContactSegment.bulkCreate(
        contactsToAdd.map((contactId) => ({
          contactId,
          segmentId,
          isManuallyAdded: false,
          addedAt: new Date(),
        }))
      )
    }

    // Supprimer les contacts qui ne correspondent plus aux règles
    if (contactsToRemove.length > 0) {
      await ContactSegment.destroy({
        where: {
          contactId: { [Op.in]: contactsToRemove },
          segmentId,
          isManuallyAdded: false,
        },
      })
    }

    // Mettre à jour le compteur et la date d'évaluation du segment
    await Segment.update(
      {
        contactCount: matchingContactIds.length + manuallyAddedIds.length,
        lastEvaluatedAt: new Date(),
      },
      { where: { id: segmentId } }
    )

    return {
      added: contactsToAdd.length,
      removed: contactsToRemove.length,
      total: matchingContactIds.length + manuallyAddedIds.length,
    }
  } catch (error) {
    console.error("Error updating segment members:", error)
    throw error
  }
}
