import bcrypt from "bcrypt"
import { User } from "../models"

export const seedUsers = async (
  tenantId: string,
  adminRoleId: string,
  userRoleId: string
) => {
  try {
    console.log("Seeding users...")

    // Vérifier si des utilisateurs existent déjà pour ce tenant
    const userCount = await User.count({ where: { tenantId } })

    if (userCount > 0) {
      console.log(`Skipping user seeding: ${userCount} users already exist for tenant`)
      return
    }

    // Récupérer les mots de passe depuis les variables d'environnement
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123"
    const userPassword = process.env.USER_PASSWORD || "user123"

    // Hasher les mots de passe
    const saltRounds = 10
    const adminHashedPassword = await bcrypt.hash(adminPassword, saltRounds)
    const userHashedPassword = await bcrypt.hash(userPassword, saltRounds)

    // Créer l'utilisateur admin
    const admin = await User.create({
      email: "admin@admin.com",
      password: adminHashedPassword,
      firstName: "Admin",
      lastName: "User",
      roleId: adminRoleId,
      tenantId,
      isActive: true,
    })

    // Créer l'utilisateur standard
    const user = await User.create({
      email: "user@user.com",
      password: userHashedPassword,
      firstName: "Regular",
      lastName: "User",
      roleId: userRoleId,
      tenantId,
      isActive: true,
    })

    console.log(`Created admin user: ${admin.get("email")}`)
    console.log(`Created standard user: ${user.get("email")}`)
  } catch (error) {
    console.error("Error seeding users:", error)
    throw error
  }
}
