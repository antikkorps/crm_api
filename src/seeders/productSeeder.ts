import { faker } from "@faker-js/faker/locale/fr"
import { v4 as uuidv4 } from "uuid"
import { Product, User } from "../models"

/**
 * Crée des produits et services de test dans la base de données
 */
export const seedProducts = async (tenantId: string) => {
  try {
    console.log("Seeding products...")

    // Vérifier si des produits existent déjà
    const existingCount = await Product.count({ where: { tenantId } })

    if (existingCount > 0) {
      console.log(`${existingCount} produits existent déjà, seed ignoré`)
      return
    }

    // Récupérer un utilisateur pour l'attribution de la création
    const users = await User.findAll({
      where: { tenantId, isActive: true },
      limit: 5,
    })

    // Catégories de produits/services
    const categories = [
      "Services de consulting",
      "Formation",
      "Développement",
      "Design",
      "Maintenance",
      "Infrastructure",
      "Licences logicielles",
      "Abonnements",
    ]

    // Exemples de produits/services
    const productTemplates = [
      {
        name: "Audit stratégique",
        description:
          "Analyse approfondie de votre stratégie numérique et recommandations personnalisées",
        category: "Services de consulting",
        unitPrice: 1500.0,
        taxRate: 20.0,
      },
      {
        name: "Workshop innovation",
        description:
          "Session collaborative d'une journée pour générer des idées innovantes",
        category: "Services de consulting",
        unitPrice: 1200.0,
        taxRate: 20.0,
      },
      {
        name: "Formation développement React",
        description:
          "Formation de 3 jours sur le développement d'applications avec React",
        category: "Formation",
        unitPrice: 950.0,
        taxRate: 20.0,
      },
      {
        name: "Formation UX Design",
        description:
          "Formation de 2 jours sur les principes de design d'interface utilisateur",
        category: "Formation",
        unitPrice: 850.0,
        taxRate: 20.0,
      },
      {
        name: "Développement API REST",
        description: "Création d'une API REST sur mesure selon vos spécifications",
        category: "Développement",
        unitPrice: 1800.0,
        taxRate: 20.0,
      },
      {
        name: "Intégration frontend",
        description: "Intégration de maquettes design en HTML/CSS/JS responsive",
        category: "Développement",
        unitPrice: 1200.0,
        taxRate: 20.0,
      },
      {
        name: "Design d'interface",
        description: "Conception d'interfaces utilisateur modernes et intuitives",
        category: "Design",
        unitPrice: 1500.0,
        taxRate: 20.0,
      },
      {
        name: "Logo et identité visuelle",
        description: "Création d'un logo et d'une charte graphique complète",
        category: "Design",
        unitPrice: 1800.0,
        taxRate: 20.0,
      },
      {
        name: "Support technique mensuel",
        description: "Support technique illimité pendant un mois (10h incluses)",
        category: "Maintenance",
        unitPrice: 750.0,
        taxRate: 20.0,
      },
      {
        name: "Maintenance préventive",
        description: "Maintenance préventive trimestrielle de votre infrastructure",
        category: "Maintenance",
        unitPrice: 600.0,
        taxRate: 20.0,
      },
      {
        name: "Hébergement cloud (mensuel)",
        description:
          "Hébergement de votre application sur notre infrastructure sécurisée",
        category: "Infrastructure",
        unitPrice: 99.0,
        taxRate: 20.0,
      },
      {
        name: "Configuration serveur dédié",
        description: "Installation et configuration d'un serveur dédié",
        category: "Infrastructure",
        unitPrice: 450.0,
        taxRate: 20.0,
      },
      {
        name: "Licence CRM (annuelle)",
        description: "Licence annuelle pour notre solution CRM complète",
        category: "Licences logicielles",
        unitPrice: 1200.0,
        taxRate: 20.0,
      },
      {
        name: "Licence Suite Créative (annuelle)",
        description: "Licence annuelle pour notre suite d'outils de design",
        category: "Licences logicielles",
        unitPrice: 900.0,
        taxRate: 20.0,
      },
      {
        name: "Abonnement support premium",
        description: "Support prioritaire 24/7 pendant un an",
        category: "Abonnements",
        unitPrice: 2400.0,
        taxRate: 20.0,
      },
      {
        name: "Abonnement analytics",
        description: "Accès à notre plateforme d'analyse de données pendant un an",
        category: "Abonnements",
        unitPrice: 1200.0,
        taxRate: 20.0,
      },
    ]

    // Créer des produits/services aléatoires
    const productsToCreate = [
      ...productTemplates,
      // Ajouter quelques produits générés aléatoirement
      ...Array(10)
        .fill(null)
        .map(() => ({
          name: `${faker.commerce.productName()} ${faker.commerce.productAdjective()}`,
          description: faker.commerce.productDescription(),
          category: categories[Math.floor(Math.random() * categories.length)],
          unitPrice: parseFloat((Math.random() * 2000 + 100).toFixed(2)),
          taxRate: [0, 5.5, 10, 20][Math.floor(Math.random() * 4)],
        })),
    ]

    // Créer les produits dans la base de données
    await Promise.all(
      productsToCreate.map(async (productData, index) => {
        const randomUser =
          users.length > 0 ? users[Math.floor(Math.random() * users.length)] : null

        await Product.create({
          id: uuidv4(),
          name: productData.name,
          description: productData.description,
          code: `PROD-${(index + 1).toString().padStart(4, "0")}`,
          category: productData.category,
          unitPrice: productData.unitPrice,
          taxRate: productData.taxRate,
          isActive: Math.random() > 0.1, // 90% sont actifs
          tenantId,
          createdById: randomUser ? randomUser.get("id") : null,
          createdAt: faker.date.recent({ days: 60 }),
          updatedAt: faker.date.recent({ days: 30 }),
        })
      })
    )

    console.log(`${productsToCreate.length} produits créés avec succès`)
  } catch (error) {
    console.error("Erreur lors de la création des produits:", error)
    throw error
  }
}

// Pour exécuter le seeder directement
export const runProductSeeder = async () => {
  try {
    // Cette fonction suppose que vous avez une façon d'obtenir un tenantId
    const defaultTenantId = process.env.DEFAULT_TENANT_ID
    if (!defaultTenantId) {
      throw new Error("DEFAULT_TENANT_ID environment variable is required")
    }
    await seedProducts(defaultTenantId)
  } catch (error) {
    console.error("Failed to seed products:", error)
  }
}
