import { v4 as uuidv4 } from "uuid"
import Status from "../models/status"

export const seedStatuses = async (tenantId: string) => {
  try {
    // Define default statuses for each type
    const defaultStatuses = {
      CONTACT: [
        { name: "New", color: "#3498db", order: 1 },
        { name: "Contacted", color: "#f39c12", order: 2 },
        { name: "Qualified", color: "#2ecc71", order: 3 },
        { name: "Unqualified", color: "#e74c3c", order: 4 },
      ],
      COMPANY: [
        { name: "Lead", color: "#3498db", order: 1 },
        { name: "Customer", color: "#2ecc71", order: 2 },
        { name: "Partner", color: "#9b59b6", order: 3 },
        { name: "Inactive", color: "#7f8c8d", order: 4 },
      ],
      OPPORTUNITY: [
        { name: "New", color: "#3498db", order: 1 },
        { name: "Qualification", color: "#f39c12", order: 2 },
        { name: "Proposal", color: "#9b59b6", order: 3 },
        { name: "Negotiation", color: "#e67e22", order: 4 },
        { name: "Closed Won", color: "#2ecc71", order: 5 },
        { name: "Closed Lost", color: "#e74c3c", order: 6 },
      ],
    }

    // Loop through each type and create statuses
    for (const [type, statuses] of Object.entries(defaultStatuses)) {
      // Check if statuses of this type exist for the tenant
      const existingCount = await Status.count({
        where: { type, tenantId },
      })

      // Only create if none exist
      if (existingCount === 0) {
        console.log(`Creating default ${type} statuses for tenant ${tenantId}`)

        // Create all statuses for this type
        await Promise.all(
          statuses.map((status) =>
            Status.create({
              id: uuidv4(),
              name: status.name,
              type: type,
              color: status.color,
              order: status.order,
              tenantId,
            })
          )
        )

        console.log(`Successfully created ${statuses.length} ${type} statuses`)
      } else {
        console.log(`${type} statuses already exist for tenant ${tenantId}`)
      }
    }

    return true
  } catch (error) {
    console.error("Error seeding statuses:", error)
    throw error
  }
}

export default seedStatuses
