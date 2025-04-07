import { Status } from "../models"

export const seedStatuses = async (tenantId: string) => {
  try {
    console.log("Seeding statuses...")

    // Vérifier si des statuts existent déjà pour ce tenant
    const statusCount = await Status.count({ where: { tenantId } })

    if (statusCount > 0) {
      console.log(
        `Skipping status seeding: ${statusCount} statuses already exist for tenant`
      )
      return
    }

    // Statuts pour les contacts
    const contactStatuses = [
      { name: "Lead", color: "#3498db", order: 1 },
      { name: "Qualified", color: "#2ecc71", order: 2 },
      { name: "Customer", color: "#9b59b6", order: 3 },
      { name: "Abandonned", color: "#e74c3c", order: 4 },
    ]

    // Statuts pour les entreprises
    const companyStatuses = [
      { name: "Prospect", color: "#f1c40f", order: 1 },
      { name: "Customer", color: "#27ae60", order: 2 },
      { name: "Partner", color: "#8e44ad", order: 3 },
      { name: "Inactive", color: "#95a5a6", order: 4 },
    ]

    // Créer les statuts
    for (const status of contactStatuses) {
      await Status.create({
        ...status,
        type: "CONTACT",
        tenantId,
      })
    }

    for (const status of companyStatuses) {
      await Status.create({
        ...status,
        type: "COMPANY",
        tenantId,
      })
    }

    console.log(`Created ${contactStatuses.length} contact statuses`)
    console.log(`Created ${companyStatuses.length} company statuses`)
  } catch (error) {
    console.error("Error seeding statuses:", error)
    throw error
  }
}
