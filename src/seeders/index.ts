import { sequelize } from "../config/database"
import { seedActivities } from "./activitySeeder"
import { seedCompaniesAndContacts } from "./companyContactSeeder"
import { seedNotes } from "./noteSeeder"
import { seedRoles } from "./roleSeeder"
import { seedStatuses } from "./statusSeeder"
import { seedTenants } from "./tenantSeeder"
import { seedUsers } from "./userSeeder"

/**
 * Fonction principale pour initialiser la base de données avec des données de test
 */
export const seedDatabase = async () => {
  try {
    console.log("Starting database seeding...")

    // S'assurer que la connexion à la base de données est établie
    await sequelize.authenticate()
    console.log("Database connection authenticated")

    // Créer le tenant par défaut
    const defaultTenant = await seedTenants()

    // Récupérer le tenant existant si aucun n'a été créé
    let tenantId
    if (!defaultTenant) {
      console.log("Using existing tenant")
      // Récupérer le tenant existant
      const { Tenant } = require("../models")
      const existingTenant = await Tenant.findOne()
      if (!existingTenant) {
        throw new Error("No tenant found")
      }
      tenantId = existingTenant.get("id")
    } else {
      tenantId = defaultTenant.get("id") as string
    }

    console.log(`Using tenant ID: ${tenantId}`)

    // Créer les rôles
    const { adminRole, userRole } = await seedRoles(tenantId)

    // Vérifier que les rôles existent
    if (!adminRole || !userRole) {
      throw new Error("Failed to create roles")
    }

    // Créer les statuts
    await seedStatuses(tenantId)

    // Créer les utilisateurs
    await seedUsers(tenantId, adminRole.get("id") as string, userRole.get("id") as string)

    // Créer les entreprises et contacts
    await seedCompaniesAndContacts(tenantId)
    console.log("Completed seeding companies and contacts")

    // Créer des notes
    await seedNotes(tenantId)
    console.log("Completed seeding notes")

    // Créer des activités
    await seedActivities(tenantId)
    console.log("Completed seeding activities")

    console.log("Database seeding completed successfully")
  } catch (error) {
    console.error("Error seeding database:", error)
    throw error
  }
}

// Si le script est exécuté directement
if (require.main === module) {
  // Charger les variables d'environnement
  require("dotenv").config()

  // Exécuter le seeding
  seedDatabase()
    .then(() => {
      console.log("Seeding process finished")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Seeding process failed:", error)
      process.exit(1)
    })
}
