import { v4 as uuidv4 } from "uuid"
import { Company, Contact, Status, User } from "../models"

/**
 * Seed des entreprises et contacts
 */
export const seedCompaniesAndContacts = async (tenantId: string) => {
  try {
    console.log("Seeding companies and contacts...")

    // Vérifier si des entreprises existent déjà pour ce tenant
    const companyCount = await Company.count({ where: { tenantId } })

    if (companyCount > 0) {
      console.log(
        `Skipping company seeding: ${companyCount} companies already exist for tenant`
      )
      return
    }

    // Récupérer les statuts disponibles
    const companyStatuses = await Status.findAll({
      where: { tenantId, type: "COMPANY" },
    })

    const contactStatuses = await Status.findAll({
      where: { tenantId, type: "CONTACT" },
    })

    if (companyStatuses.length === 0 || contactStatuses.length === 0) {
      console.log("No statuses found, please seed statuses first")
      return
    }

    // Récupérer les utilisateurs pour l'assignation
    const users = await User.findAll({ where: { tenantId } })
    if (users.length === 0) {
      console.log("No users found, please seed users first")
      return
    }

    // Données de test pour les entreprises
    const companies = [
      {
        name: "TechInnovate",
        website: "https://techinnovate.com",
        industry: "Technology",
        address: "123 Tech Avenue",
        city: "San Francisco",
        zipCode: "94105",
        country: "USA",
      },
      {
        name: "Global Finance Partners",
        website: "https://gfpartners.com",
        industry: "Finance",
        address: "456 Money Street",
        city: "New York",
        zipCode: "10004",
        country: "USA",
      },
      {
        name: "Green Earth Solutions",
        website: "https://greenearthsolutions.org",
        industry: "Environmental",
        address: "789 Eco Drive",
        city: "Portland",
        zipCode: "97201",
        country: "USA",
      },
      {
        name: "HealthPlus Medical",
        website: "https://healthplusmedical.com",
        industry: "Healthcare",
        address: "101 Wellness Boulevard",
        city: "Boston",
        zipCode: "02115",
        country: "USA",
      },
      {
        name: "Construct Pro Builder",
        website: "https://constructprobuilder.com",
        industry: "Construction",
        address: "202 Build Avenue",
        city: "Chicago",
        zipCode: "60601",
        country: "USA",
      },
      {
        name: "Pixel Perfect Design",
        website: "https://pixelperfectdesign.com",
        industry: "Design",
        address: "303 Creative Street",
        city: "Los Angeles",
        zipCode: "90001",
        country: "USA",
      },
      {
        name: "Stellar Marketing Group",
        website: "https://stellarmarketing.com",
        industry: "Marketing",
        address: "404 Brand Road",
        city: "Austin",
        zipCode: "78701",
        country: "USA",
      },
      {
        name: "Data Insights Analytics",
        website: "https://datainsightsanalytics.com",
        industry: "Data Analytics",
        address: "505 Data Drive",
        city: "Seattle",
        zipCode: "98101",
        country: "USA",
      },
      {
        name: "Quantum Education",
        website: "https://quantumeducation.org",
        industry: "Education",
        address: "606 Learning Lane",
        city: "Denver",
        zipCode: "80202",
        country: "USA",
      },
      {
        name: "Swift Logistics",
        website: "https://swiftlogistics.com",
        industry: "Logistics",
        address: "707 Shipping Street",
        city: "Miami",
        zipCode: "33101",
        country: "USA",
      },
    ]

    // Créer les entreprises
    const createdCompanies = []
    for (const companyData of companies) {
      // Assigner un statut et un utilisateur aléatoirement
      const statusId =
        companyStatuses[Math.floor(Math.random() * companyStatuses.length)].get("id")
      const assignedToId = users[Math.floor(Math.random() * users.length)].get("id")

      const company = await Company.create({
        id: uuidv4(),
        ...companyData,
        // Générer un chiffre d'affaires global aléatoire entre 100K et 50M
        globalRevenue: Math.floor(Math.random() * 50000000) + 100000,
        // Assigner une taille d'entreprise aléatoire en nombre d'employés
        size: ["1-10", "11-50", "51-200", "201-500", "501-1000", "+1000"][
          Math.floor(Math.random() * 6)
        ],
        operatingRooms: Math.floor(Math.random() * 21),
        statusId,
        assignedToId,
        tenantId,
      })

      createdCompanies.push(company)
    }

    console.log(`Created ${createdCompanies.length} companies`)

    // Données de test pour les contacts
    const contacts = [
      {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "555-123-4567",
        position: "CEO",
      },
      {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "555-987-6543",
        position: "CTO",
      },
      {
        firstName: "Robert",
        lastName: "Johnson",
        email: "robert.johnson@example.com",
        phone: "555-456-7890",
        position: "Marketing Director",
      },
      {
        firstName: "Emily",
        lastName: "Davis",
        email: "emily.davis@example.com",
        phone: "555-789-0123",
        position: "HR Manager",
      },
      {
        firstName: "Michael",
        lastName: "Wilson",
        email: "michael.wilson@example.com",
        phone: "555-321-0987",
        position: "Sales Director",
      },
      {
        firstName: "Sarah",
        lastName: "Thompson",
        email: "sarah.thompson@example.com",
        phone: "555-654-3210",
        position: "Product Manager",
      },
      {
        firstName: "David",
        lastName: "Brown",
        email: "david.brown@example.com",
        phone: "555-098-7654",
        position: "Financial Analyst",
      },
      {
        firstName: "Lisa",
        lastName: "Garcia",
        email: "lisa.garcia@example.com",
        phone: "555-345-6789",
        position: "Operations Manager",
      },
      {
        firstName: "James",
        lastName: "Martinez",
        email: "james.martinez@example.com",
        phone: "555-234-5678",
        position: "Software Engineer",
      },
      {
        firstName: "Jennifer",
        lastName: "Robinson",
        email: "jennifer.robinson@example.com",
        phone: "555-876-5432",
        position: "Customer Service Manager",
      },
      {
        firstName: "Thomas",
        lastName: "Clark",
        email: "thomas.clark@example.com",
        phone: "555-567-8901",
        position: "Project Manager",
      },
      {
        firstName: "Jessica",
        lastName: "Lewis",
        email: "jessica.lewis@example.com",
        phone: "555-678-9012",
        position: "Graphic Designer",
      },
      {
        firstName: "Daniel",
        lastName: "Lee",
        email: "daniel.lee@example.com",
        phone: "555-789-0123",
        position: "Business Analyst",
      },
      {
        firstName: "Patricia",
        lastName: "Walker",
        email: "patricia.walker@example.com",
        phone: "555-890-1234",
        position: "Content Writer",
      },
      {
        firstName: "Christopher",
        lastName: "Hall",
        email: "christopher.hall@example.com",
        phone: "555-901-2345",
        position: "IT Administrator",
      },
      {
        firstName: "Elizabeth",
        lastName: "Allen",
        email: "elizabeth.allen@example.com",
        phone: "555-432-1098",
        position: "Social Media Manager",
      },
      {
        firstName: "Matthew",
        lastName: "Young",
        email: "matthew.young@example.com",
        phone: "555-543-2109",
        position: "Research Scientist",
      },
      {
        firstName: "Nancy",
        lastName: "King",
        email: "nancy.king@example.com",
        phone: "555-654-3210",
        position: "Legal Counsel",
      },
      {
        firstName: "Anthony",
        lastName: "Wright",
        email: "anthony.wright@example.com",
        phone: "555-765-4321",
        position: "Quality Assurance",
      },
      {
        firstName: "Margaret",
        lastName: "Lopez",
        email: "margaret.lopez@example.com",
        phone: "555-876-5432",
        position: "Training Coordinator",
      },
    ]

    // Créer les contacts
    const createdContacts = []
    for (const contactData of contacts) {
      // Assigner une entreprise, un statut et un utilisateur aléatoirement
      const companyId =
        createdCompanies[Math.floor(Math.random() * createdCompanies.length)].get("id")
      const statusId =
        contactStatuses[Math.floor(Math.random() * contactStatuses.length)].get("id")
      const assignedToId = users[Math.floor(Math.random() * users.length)].get("id")

      const contact = await Contact.create({
        id: uuidv4(),
        ...contactData,
        companyId,
        statusId,
        assignedToId,
        tenantId,
      })

      createdContacts.push(contact)
    }

    console.log(`Created ${createdContacts.length} contacts`)

    // Créer quelques contacts sans entreprise
    const independentContacts = [
      {
        firstName: "William",
        lastName: "Independent",
        email: "william.ind@example.com",
        phone: "555-222-3333",
        position: "Freelancer",
      },
      {
        firstName: "Sofia",
        lastName: "Freelance",
        email: "sofia.free@example.com",
        phone: "555-333-4444",
        position: "Consultant",
      },
      {
        firstName: "Alex",
        lastName: "Solo",
        email: "alex.solo@example.com",
        phone: "555-444-5555",
        position: "Entrepreneur",
      },
    ]

    for (const contactData of independentContacts) {
      const statusId =
        contactStatuses[Math.floor(Math.random() * contactStatuses.length)].get("id")
      const assignedToId = users[Math.floor(Math.random() * users.length)].get("id")

      const contact = await Contact.create({
        id: uuidv4(),
        ...contactData,
        statusId,
        assignedToId,
        tenantId,
      })

      createdContacts.push(contact)
    }

    console.log(`Created ${independentContacts.length} independent contacts`)
    console.log(
      `Total: ${createdCompanies.length} companies and ${createdContacts.length} contacts`
    )
  } catch (error) {
    console.error("Error seeding companies and contacts:", error)
    throw error
  }
}
