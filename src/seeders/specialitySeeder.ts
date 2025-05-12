import { v4 as uuidv4 } from "uuid"
import { Company, CompanySpeciality, Speciality } from "../models"

// Liste des spécialités médicales possibles
const medicalSpecialities = [
  "Cardiologie",
  "Neurologie",
  "Orthopédie",
  "Ophtalmologie",
  "Gastroentérologie",
  "Urologie",
  "Gynécologie",
  "Chirurgie générale",
  "Chirurgie plastique",
  "Oncologie",
  "Pédiatrie",
  "ORL",
  "Dermatologie",
  "Radiologie",
  "Anesthésiologie",
]

export const seedSpecialities = async (tenantId: string) => {
  try {
    console.log("Seeding specialities...")

    // 1. Créer toutes les spécialités uniques
    const specialityEntries = []
    for (const speciality of medicalSpecialities) {
      const exists = await Speciality.findOne({ where: { name: speciality } })
      if (!exists) {
        specialityEntries.push({
          id: uuidv4(),
          name: speciality,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }

    if (specialityEntries.length > 0) {
      await Speciality.bulkCreate(specialityEntries)
      console.log(`Created ${specialityEntries.length} specialities`)
    } else {
      console.log("All specialities already exist")
    }

    // 2. Récupérer toutes les entreprises et spécialités
    const companies = await Company.findAll({ where: { tenantId } })
    const allSpecialities = await Speciality.findAll()

    if (companies.length === 0) {
      console.log("No companies found, please seed companies first")
      return
    }

    // 3. Associer des spécialités aux entreprises
    const companySpecialitiesToCreate = []

    for (const company of companies) {
      // Vérifier si cette entreprise a déjà des spécialités
      const existingAssociations = await CompanySpeciality.findAll({
        where: { companyId: company.get("id") },
      })

      if (existingAssociations.length > 0) {
        console.log(
          `Company ${company.get("name")} already has ${
            existingAssociations.length
          } specialities, skipping`
        )
        continue
      }

      // Sélectionner un nombre aléatoire de spécialités pour cette entreprise (entre 1 et 4)
      const numSpecialities = Math.floor(Math.random() * 4) + 1

      // Mélanger la liste des spécialités et en prendre quelques-unes
      const shuffled = [...allSpecialities].sort(() => 0.5 - Math.random())
      const selectedSpecialities = shuffled.slice(0, numSpecialities)

      // Créer des associations pour chaque spécialité
      for (const speciality of selectedSpecialities) {
        companySpecialitiesToCreate.push({
          id: uuidv4(),
          companyId: company.get("id"),
          specialityId: speciality.get("id"),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }

    // Créer les associations
    if (companySpecialitiesToCreate.length > 0) {
      await CompanySpeciality.bulkCreate(companySpecialitiesToCreate)
      console.log(
        `Created ${
          companySpecialitiesToCreate.length
        } company-speciality associations for ${
          companySpecialitiesToCreate.length / 2
        } companies`
      )
    } else {
      console.log(
        "All company-speciality associations already exist or no companies to associate"
      )
    }
  } catch (error) {
    console.error("Error seeding specialities:", error)
    throw error
  }
}
