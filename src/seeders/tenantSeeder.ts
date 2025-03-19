import { Tenant } from "../models"

export const seedTenants = async () => {
  try {
    console.log("Seeding tenants...")

    // Vérifier si des tenants existent déjà
    const tenantCount = await Tenant.count()

    if (tenantCount > 0) {
      console.log(`Skipping tenant seeding: ${tenantCount} tenants already exist`)
      return
    }

    // Créer le tenant par défaut
    const defaultTenant = await Tenant.create({
      name: "Default Tenant",
      domain: "default.crm.local",
    })

    console.log(`Created default tenant with ID: ${defaultTenant.get("id")}`)
    return defaultTenant
  } catch (error) {
    console.error("Error seeding tenants:", error)
    throw error
  }
}
