import { Role } from "../models"

export const seedRoles = async (tenantId: string) => {
  try {
    console.log("Seeding roles...")

    // Vérifier si des rôles existent déjà pour ce tenant
    const roleCount = await Role.count({ where: { tenantId } })

    if (roleCount > 0) {
      console.log(`Skipping role seeding: ${roleCount} roles already exist for tenant`)
      const adminRole = await Role.findOne({
        where: {
          name: "Admin",
          tenantId,
        },
      })

      const userRole = await Role.findOne({
        where: {
          name: "User",
          tenantId,
        },
      })

      return { adminRole, userRole }
    }

    // Créer les rôles par défaut
    const adminRole = await Role.create({
      name: "Admin",
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        contacts: { create: true, read: true, update: true, delete: true },
        companies: { create: true, read: true, update: true, delete: true },
        statuses: { create: true, read: true, update: true, delete: true },
        roles: { create: true, read: true, update: true, delete: true },
        tenant: { create: false, read: true, update: true, delete: false },
      },
      tenantId,
    })

    const userRole = await Role.create({
      name: "User",
      permissions: {
        users: { create: false, read: true, update: false, delete: false },
        contacts: { create: true, read: true, update: true, delete: false },
        companies: { create: true, read: true, update: true, delete: false },
        statuses: { create: false, read: true, update: false, delete: false },
        roles: { create: false, read: false, update: false, delete: false },
        tenant: { create: false, read: true, update: false, delete: false },
      },
      tenantId,
    })

    console.log(`Created Admin role with ID: ${adminRole.get("id")}`)
    console.log(`Created User role with ID: ${userRole.get("id")}`)

    return { adminRole, userRole }
  } catch (error) {
    console.error("Error seeding roles:", error)
    throw error
  }
}
