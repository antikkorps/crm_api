import { faker } from "@faker-js/faker/locale/fr"
import { Company, Contact, Opportunity, Status, User } from "../models"

/**
 * Crée des opportunités de test dans la base de données
 */
export const seedOpportunities = async (tenantId: string) => {
  try {
    // Vérifier si des opportunités existent déjà
    const existingCount = await Opportunity.count({ where: { tenantId } })

    if (existingCount > 0) {
      console.log(`${existingCount} opportunités existent déjà, seed ignoré`)
      return
    }

    // Récupérer les statuts de type OPPORTUNITY
    const statuses = await Status.findAll({
      where: { tenantId, type: "OPPORTUNITY" },
    })

    if (statuses.length === 0) {
      console.log(
        "Aucun statut d'opportunité trouvé, veuillez d'abord exécuter le seeder de statuts"
      )
      return
    }

    // Récupérer les utilisateurs (pour l'assignation)
    const users = await User.findAll({ where: { tenantId } })

    if (users.length === 0) {
      console.log(
        "Aucun utilisateur trouvé, veuillez d'abord exécuter le seeder d'utilisateurs"
      )
      return
    }

    // Récupérer les entreprises et contacts
    const companies = await Company.findAll({ where: { tenantId } })
    const contacts = await Contact.findAll({ where: { tenantId } })

    if (companies.length === 0 || contacts.length === 0) {
      console.log(
        "Aucune entreprise ou contact trouvé, veuillez d'abord exécuter le seeder d'entreprises et contacts"
      )
      return
    }

    // Créer 30 opportunités de test
    const opportunities = []

    for (let i = 0; i < 30; i++) {
      // Sélectionner aléatoirement un statut, un utilisateur, une entreprise et un contact
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const user = users[Math.floor(Math.random() * users.length)]
      const company = companies[Math.floor(Math.random() * companies.length)]
      const contact =
        contacts.filter((c) => c.get("companyId") === company.get("id"))[0] ||
        contacts[Math.floor(Math.random() * contacts.length)]

      // Générer une valeur réaliste pour l'opportunité
      const value = Math.floor(
        faker.number.float({ min: 1000, max: 100000, multipleOf: 100 })
      )

      // Générer une probabilité de conversion (en %)
      const probability = Math.floor(
        faker.number.float({ min: 10, max: 90, multipleOf: 5 })
      )

      // Calculer une date de création entre il y a 6 mois et aujourd'hui
      const now = new Date()
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const createdAt = faker.date.between({ from: sixMonthsAgo, to: now })

      opportunities.push({
        name: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        value,
        probability,
        statusId: status.get("id") as string,
        companyId: company.get("id") as string,
        contactId: contact?.get("id") as string | undefined,
        assignedToId: user.get("id") as string,
        tenantId,
        createdAt,
        updatedAt: createdAt,
      })
    }

    // Insérer les opportunités
    await Opportunity.bulkCreate(opportunities)
    console.log(`${opportunities.length} opportunités créées avec succès`)
  } catch (error) {
    console.error("Erreur lors de la création des opportunités:", error)
    throw error
  }
}

// Pour exécuter le seeder directement
export const runOpportunitySeeder = async () => {
  const defaultTenantId = process.env.DEFAULT_TENANT_ID || "default-tenant-id"
  await seedOpportunities(defaultTenantId)
  console.log("Opportunités seeding terminé")
}

// Si exécuté directement
if (require.main === module) {
  // Charger les variables d'environnement
  require("dotenv").config()

  runOpportunitySeeder()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
