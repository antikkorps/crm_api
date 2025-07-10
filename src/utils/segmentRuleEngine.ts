import { Op } from "sequelize"
import { Contact } from "../models"

/**
 * Types pour les règles de segmentation
 */

// Condition simple : un champ, un opérateur, une valeur
export interface SimpleCondition {
  field: string // ex: "firstName", "email", "statusId"
  operator:
    | "equals"
    | "notEquals"
    | "contains"
    | "notContains"
    | "startsWith"
    | "endsWith"
    | "greaterThan"
    | "lessThan"
  value: any // ex: "John", "gmail.com", "ACTIVE"
}

// Condition complexe : groupe de conditions avec AND ou OR
export interface ComplexCondition {
  operator: "AND" | "OR"
  conditions: (SimpleCondition | ComplexCondition)[] // Array de conditions (peut être imbriqué)
}

export type SegmentRule =
  | SimpleCondition
  | ComplexCondition
  | (SimpleCondition | ComplexCondition)[]

/**
 * Exemples de règles valides :
 *
 * // Condition simple
 * {
 *   field: "firstName",
 *   operator: "contains",
 *   value: "John"
 * }
 *
 * // Condition complexe avec AND
 * {
 *   operator: "AND",
 *   conditions: [
 *     { field: "firstName", operator: "contains", value: "John" },
 *     { field: "email", operator: "contains", value: "gmail.com" }
 *   ]
 * }
 *
 * // Condition complexe avec OR
 * {
 *   operator: "OR",
 *   conditions: [
 *     { field: "statusId", operator: "equals", value: "ACTIVE" },
 *     { field: "statusId", operator: "equals", value: "PENDING" }
 *   ]
 * }
 */

/**
 * Convertit une règle de segmentation en condition Sequelize pour les requêtes
 */
export function buildSequelizeQuery(rule: SegmentRule): any {
  // Validation de la règle
  if (!rule) {
    throw new Error("Rule is required")
  }

  // Gestion spéciale : si c'est un tableau, le convertir en condition AND
  if (Array.isArray(rule)) {
    if (rule.length === 0) {
      throw new Error("Rule array cannot be empty")
    }
    if (rule.length === 1) {
      // Si un seul élément, traiter comme une condition simple
      return buildSequelizeQuery(rule[0])
    }
    // Sinon, convertir en condition AND
    return buildSequelizeQuery({
      operator: "AND",
      conditions: rule,
    })
  }

  // Cas de base : une condition simple
  if ("field" in rule) {
    const { field, operator, value } = rule

    if (!field || !operator) {
      throw new Error("Invalid simple condition: field and operator are required")
    }

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
  if ("operator" in rule && "conditions" in rule) {
    const { operator, conditions } = rule

    if (!operator || !conditions || !Array.isArray(conditions)) {
      throw new Error(
        "Invalid complex condition: operator and conditions array are required"
      )
    }

    if (conditions.length === 0) {
      throw new Error("Complex condition must have at least one condition")
    }

    const clauseOperator = operator === "AND" ? Op.and : Op.or

    return {
      [clauseOperator]: conditions.map((condition) => buildSequelizeQuery(condition)),
    }
  }

  throw new Error(
    "Invalid rule format: must be either a simple condition, complex condition, or array of conditions"
  )
}

/**
 * Évalue une règle pour un contact donné
 */
export function evaluateRule(contact: any, rule: SegmentRule): boolean {
  // Validation de la règle
  if (!rule) {
    return false
  }

  // Cas de base : une condition simple
  if ("field" in rule) {
    const { field, operator, value } = rule

    if (!field || !operator) {
      return false
    }

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
  if ("operator" in rule && "conditions" in rule) {
    const { operator, conditions } = rule

    if (
      !operator ||
      !conditions ||
      !Array.isArray(conditions) ||
      conditions.length === 0
    ) {
      return false
    }

    if (operator === "AND") {
      return conditions.every((condition) => evaluateRule(contact, condition))
    } else {
      return conditions.some((condition) => evaluateRule(contact, condition))
    }
  }

  return false
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
