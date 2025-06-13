import { faker } from "@faker-js/faker/locale/fr"
import { v4 as uuidv4 } from "uuid"
import { Company, Contact, Opportunity, Quote, QuoteItem, User } from "../models"
import { QuoteStatus } from "../models/quote"

/**
 * Crée des devis de test dans la base de données
 */
export const seedQuotes = async (tenantId: string) => {
  try {
    console.log("Seeding quotes...")

    // Vérifier si des devis existent déjà
    const existingCount = await Quote.count({ where: { tenantId } })

    if (existingCount > 0) {
      console.log(`${existingCount} devis existent déjà, seed ignoré`)
      return
    }

    // Récupérer des opportunités pour lier les devis
    const opportunities = await Opportunity.findAll({
      where: { tenantId },
      limit: 15,
    })

    if (opportunities.length === 0) {
      console.log(
        "Aucune opportunité trouvée, veuillez d'abord exécuter le seeder d'opportunités"
      )
      return
    }

    // Récupérer les utilisateurs pour l'assignation
    const users = await User.findAll({
      where: { tenantId, isActive: true },
      limit: 5,
    })

    if (users.length === 0) {
      console.log("Aucun utilisateur trouvé pour l'assignation des devis")
      return
    }

    // Récupérer les contacts pour les devis
    const contacts = await Contact.findAll({
      where: { tenantId },
      limit: 20,
    })

    // Récupérer les entreprises pour les devis
    const companies = await Company.findAll({
      where: { tenantId },
      limit: 10,
    })

    // Noms de produits/services couramment utilisés dans les devis
    const productNames = [
      "Licence logicielle",
      "Abonnement annuel",
      "Service de consulting",
      "Formation",
      "Support technique",
      "Développement sur mesure",
      "Maintenance annuelle",
      "Audit de sécurité",
      "Migration de données",
      "Hébergement cloud",
      "Intégration API",
      "Certification",
    ]

    // Descriptions pour les produits/services
    const productDescriptions = [
      "Licence perpétuelle avec mises à jour pendant 12 mois",
      "Abonnement incluant support et mises à jour",
      "Accompagnement par un consultant senior",
      "Session de formation pour votre équipe (jusqu'à 10 personnes)",
      "Support technique prioritaire 24/7",
      "Développement de fonctionnalités sur mesure selon cahier des charges",
      "Service de maintenance incluant correctifs et petites évolutions",
      "Audit complet de la sécurité de votre infrastructure",
      "Migration complète de vos données vers notre plateforme",
      "Solution d'hébergement sécurisée et évolutive",
      "Développement et documentation d'interfaces API",
      "Programme de certification officielle",
    ]

    // Termes et conditions standard
    const termsAndConditions = [
      "Paiement à 30 jours date de facture. Pénalités de retard : taux légal en vigueur.",
      "Ce devis est valable 30 jours à compter de la date d'émission. Paiement : 50% à la commande, 50% à la livraison.",
      "Tous nos prix sont hors taxes. Le paiement doit être effectué sous 15 jours.",
      "Ce devis est conclu sous réserve de disponibilité de nos équipes aux dates prévues.",
    ]

    // Notes pour les devis
    const quoteNotes = [
      "Le client souhaite une mise en place rapide",
      "Besoin de formation supplémentaire à prévoir",
      "Projet prioritaire pour le client",
      "Client référé par une entreprise partenaire",
      "Première commande de ce client",
      "Le client a demandé un échéancier de paiement",
      "Tarifs négociés avec remise exceptionnelle",
    ]

    const quotes = []

    // Générer des devis
    for (let i = 0; i < 20; i++) {
      // Choisir des éléments aléatoires pour ce devis
      const opportunity = opportunities[Math.floor(Math.random() * opportunities.length)]
      const user = users[Math.floor(Math.random() * users.length)]

      // Récupérer le contact et l'entreprise de l'opportunité si disponibles, sinon en choisir aléatoirement
      let contactId = opportunity.contactId
      let companyId = opportunity.companyId

      if (!contactId && contacts.length > 0) {
        const contact = contacts[Math.floor(Math.random() * contacts.length)]
        contactId = contact.get("id") as string
      }

      if (!companyId && companies.length > 0) {
        const company = companies[Math.floor(Math.random() * companies.length)]
        companyId = company.get("id") as string
      }

      // Statut aléatoire du devis avec une répartition réaliste
      const statusProbability = Math.random()
      let status
      if (statusProbability < 0.3) {
        status = QuoteStatus.DRAFT
      } else if (statusProbability < 0.6) {
        status = QuoteStatus.SENT
      } else if (statusProbability < 0.8) {
        status = QuoteStatus.ACCEPTED
      } else if (statusProbability < 0.95) {
        status = QuoteStatus.REJECTED
      } else {
        status = QuoteStatus.CANCELLED
      }

      // Créer une date de validité (entre 15 et 90 jours à partir de maintenant)
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + Math.floor(Math.random() * 75) + 15)

      // Décider si on applique une remise globale
      const hasDiscount = Math.random() > 0.7
      const discountType = Math.random() > 0.5 ? "percentage" : "fixed"
      const discountValue =
        discountType === "percentage"
          ? Math.floor(Math.random() * 20) + 5 // 5-25%
          : Math.floor(Math.random() * 1000) + 200 // 200-1200€

      // Créer le devis
      const quoteData = {
        id: uuidv4(),
        reference: generateQuoteReference(),
        title: faker.commerce.productName() + " - " + faker.company.buzzPhrase(),
        description: faker.lorem.paragraph(),
        status,
        validUntil,
        totalAmount: 0, // Sera calculé après l'ajout des éléments
        taxes: 0, // Sera calculé après l'ajout des éléments
        discountAmount: hasDiscount ? discountValue : null,
        discountType: hasDiscount ? discountType.toUpperCase() : null,
        notes:
          Math.random() > 0.5
            ? quoteNotes[Math.floor(Math.random() * quoteNotes.length)]
            : null,
        terms: termsAndConditions[Math.floor(Math.random() * termsAndConditions.length)],
        opportunityId: opportunity.id,
        contactId,
        companyId,
        assignedToId: user.get("id") as string,
        tenantId,
        createdAt: faker.date.recent({ days: 30 }),
        updatedAt: faker.date.recent({ days: 15 }),
      }

      // Ajouter le devis à la liste
      quotes.push(quoteData)
    }

    // Créer les devis dans la base de données
    for (const quoteData of quotes) {
      const quote = await Quote.create(quoteData)

      // Générer un nombre aléatoire d'éléments de devis (1 à 8)
      const numItems = Math.floor(Math.random() * 7) + 1

      let totalAmount = 0
      let totalTaxes = 0

      // Créer les éléments de devis
      for (let j = 0; j < numItems; j++) {
        const quantity = Math.floor(Math.random() * 9) + 1
        const unitPrice = parseFloat((Math.random() * 990 + 10).toFixed(2))
        const taxRate = [0, 5.5, 10, 20][Math.floor(Math.random() * 4)]

        const hasItemDiscount = Math.random() > 0.8
        const itemDiscountType = Math.random() > 0.5 ? "PERCENTAGE" : "FIXED"
        const itemDiscount =
          itemDiscountType === "PERCENTAGE"
            ? Math.floor(Math.random() * 15) + 5 // 5-20%
            : Math.floor(Math.random() * 100) + 50 // 50-150€

        // Calculer le total de l'élément
        let itemTotal = quantity * unitPrice
        if (hasItemDiscount) {
          if (itemDiscountType === "PERCENTAGE") {
            itemTotal = itemTotal * (1 - itemDiscount / 100)
          } else {
            itemTotal = Math.max(0, itemTotal - itemDiscount)
          }
        }

        const itemTax = (itemTotal * taxRate) / 100

        totalAmount += itemTotal
        totalTaxes += itemTax

        await QuoteItem.create({
          id: uuidv4(),
          quoteId: quote.id,
          // The QuoteItemInstance doesn't have a name field, using description instead
          description:
            productNames[Math.floor(Math.random() * productNames.length)] +
            ": " +
            productDescriptions[Math.floor(Math.random() * productDescriptions.length)],
          quantity,
          unitPrice,
          taxRate,
          discount: hasItemDiscount ? itemDiscount : null,
          discountType: hasItemDiscount ? itemDiscountType : null,
          totalPrice: itemTotal,
          position: j,
          createdAt: quote.createdAt,
          updatedAt: quote.updatedAt,
        })
      }

      // Appliquer la remise globale si nécessaire
      if (quote.discountAmount && quote.discountType) {
        if (quote.discountType === "PERCENTAGE") {
          totalAmount = totalAmount * (1 - Number(quote.discountAmount) / 100)
        } else {
          totalAmount = Math.max(0, totalAmount - Number(quote.discountAmount))
        }
      }

      // Mettre à jour les totaux du devis
      await quote.update({
        totalAmount,
        taxes: totalTaxes,
      })
    }

    console.log(`${quotes.length} devis créés avec succès`)
  } catch (error) {
    console.error("Erreur lors de la création des devis:", error)
    throw error
  }
}

/**
 * Génère une référence de devis unique
 */
function generateQuoteReference(): string {
  const currentDate = new Date()
  const year = currentDate.getFullYear().toString().slice(-2)
  const month = String(currentDate.getMonth() + 1).padStart(2, "0")
  const uniqueId = Math.floor(1000 + Math.random() * 9000)
  return `Q${year}${month}-${uniqueId}`
}

// Pour exécuter le seeder directement
export const runQuoteSeeder = async () => {
  try {
    // Cette fonction suppose que vous avez une façon d'obtenir un tenantId
    const defaultTenantId = process.env.DEFAULT_TENANT_ID
    if (!defaultTenantId) {
      throw new Error("DEFAULT_TENANT_ID environment variable is required")
    }
    await seedQuotes(defaultTenantId)
  } catch (error) {
    console.error("Failed to seed quotes:", error)
  }
}
