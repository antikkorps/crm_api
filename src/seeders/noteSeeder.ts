import { v4 as uuidv4 } from "uuid"
import { Company, Contact, Note, User } from "../models"

export const seedNotes = async (tenantId: string) => {
  try {
    console.log("Seeding notes...")

    // Vérifier si des notes existent déjà pour ce tenant
    const noteCount = await Note.count({ where: { tenantId } })

    if (noteCount > 0) {
      console.log(`Skipping note seeding: ${noteCount} notes already exist for tenant`)
      return
    }

    // Récupérer quelques utilisateurs, contacts et entreprises pour les notes
    const users = await User.findAll({ where: { tenantId }, limit: 5 })
    if (users.length === 0) {
      console.log("No users found for note seeding, skipping...")
      return
    }

    const contacts = await Contact.findAll({ where: { tenantId }, limit: 10 })
    const companies = await Company.findAll({ where: { tenantId }, limit: 5 })

    // Vérifier qu'il y a des contacts ou des entreprises
    if (contacts.length === 0 && companies.length === 0) {
      console.log("No contacts or companies found for note seeding, skipping...")
      return
    }

    // Templates de notes pour les contacts
    const contactNoteTemplates = [
      "Premier contact établi avec {firstName}. {pronoun} semble intéressé(e) par nos services de {service}.",
      "Appel de suivi avec {firstName}. {pronoun} a demandé plus d'informations sur notre tarification.",
      "Rencontre avec {firstName} lors du salon {event}. Très bon contact, à recontacter dans une semaine.",
      "{firstName} est un décideur clé chez {company}. Son budget est d'environ 15 000€ pour l'année.",
      "Discussion productive avec {firstName} concernant leurs besoins en {service}. Points importants : rapidité de déploiement et formation des équipes.",
      "{firstName} a mentionné qu'ils travaillent actuellement avec {competitor}. Points de douleur : support client médiocre et fonctionnalités limitées.",
      "Échange de mail avec {firstName}. {pronoun} souhaite organiser une démo pour son équipe la semaine prochaine.",
      "Information importante : {firstName} prend sa retraite dans 3 mois. Son successeur sera {successor}.",
      "{firstName} a partagé les spécifications techniques requises pour leur projet. Document enregistré dans le dossier partagé.",
      "Feedback négatif de {firstName} concernant notre dernière proposition. Trop chère selon lui/elle. Besoin de retravailler l'offre.",
    ]

    // Templates de notes pour les entreprises
    const companyNoteTemplates = [
      "{company} est une entreprise du secteur {industry} avec environ {employees} employés.",
      "Potentiel de collaboration important avec {company}. Leur budget annuel est estimé à {budget}€.",
      "{company} utilise actuellement les solutions de {competitor}. Contrat se termine dans {months} mois.",
      "Participation de {company} à notre webinaire du {date}. 3 participants de leur équipe direction.",
      "Points clés de la réunion avec {company} : besoin d'automatisation des processus de {process}, réduction des coûts opérationnels de 15%.",
      "Analyse de la situation financière de {company} : croissance de {growth}% sur le dernier trimestre, expansion prévue vers {market}.",
      "Problématiques principales de {company} : {problem1}, {problem2} et {problem3}. Notre solution peut répondre à au moins deux de ces points.",
      "Structure décisionnelle chez {company} : tout projet > {amount}€ doit passer par le comité d'investissement qui se réunit tous les {frequency}.",
      "Visite des locaux de {company}. Impressions positives sur leur culture d'entreprise et leurs installations.",
      "Alerte concurrentielle : {competitor} fait une offre agressive à {company}. Nécessité d'accélérer notre proposition.",
    ]

    // Variables de remplacement pour les templates
    const services = [
      "conseil",
      "formation",
      "développement logiciel",
      "marketing digital",
      "automatisation",
      "analyse de données",
    ]
    const events = [
      "Digital Summit 2023",
      "Tech Expo",
      "Forum de l'Innovation",
      "Conférence Annuelle des Décideurs IT",
    ]
    const competitors = ["CompetitorX", "TechRival", "SolutionPro", "ServiceMaster"]
    const industries = [
      "technologie",
      "santé",
      "finance",
      "éducation",
      "manufacturing",
      "retail",
    ]
    const problems = [
      "obsolescence des systèmes",
      "manque d'intégration",
      "coûts élevés",
      "inefficacités opérationnelles",
      "adoption technologique",
      "résistance au changement",
    ]
    const markets = [
      "Europe de l'Est",
      "Asie du Sud-Est",
      "Amérique Latine",
      "Afrique",
      "Moyen-Orient",
    ]
    const successors = [
      "Marie Laurent",
      "Thomas Dubois",
      "Sophie Martin",
      "Alexandre Chen",
    ]
    const processes = [
      "vente",
      "recrutement",
      "gestion de stock",
      "service client",
      "logistique",
    ]
    const frequencies = ["mois", "trimestre", "deux semaines"]

    // Tableau pour stocker toutes les notes à créer
    const notesToCreate = []

    // Créer des notes pour les contacts
    if (contacts.length > 0) {
      for (let i = 0; i < 30; i++) {
        // Sélectionner aléatoirement un utilisateur et un contact
        const user = users[Math.floor(Math.random() * users.length)]
        const contact = contacts[Math.floor(Math.random() * contacts.length)]

        // Sélectionner aléatoirement un template
        let template =
          contactNoteTemplates[Math.floor(Math.random() * contactNoteTemplates.length)]

        // Remplacer les variables dans le template
        const firstName = contact.get("firstName")
        const pronoun = Math.random() > 0.5 ? "Il" : "Elle"
        const service = services[Math.floor(Math.random() * services.length)]
        const event = events[Math.floor(Math.random() * events.length)]
        const companyId = contact.get("companyId") as string | null
        const company = companyId
          ? (await Company.findByPk(companyId))?.get("name") || "leur entreprise"
          : "leur entreprise"
        const competitor = competitors[Math.floor(Math.random() * competitors.length)]
        const successor = successors[Math.floor(Math.random() * successors.length)]

        template = template
          .replace("{firstName}", firstName as string)
          .replace("{pronoun}", pronoun)
          .replace("{service}", service)
          .replace("{event}", event)
          .replace("{company}", company as string)
          .replace("{competitor}", competitor)
          .replace("{successor}", successor)

        // Créer la note
        const noteData = {
          id: uuidv4(),
          content: template,
          contactId: contact.get("id"),
          companyId: null,
          createdById: user.get("id"),
          tenantId: tenantId,
          createdAt: randomDateInPast(60),
          updatedAt: randomDateInPast(30),
        }

        notesToCreate.push(noteData)
      }
    }

    // Créer des notes pour les entreprises
    if (companies.length > 0) {
      for (let i = 0; i < 20; i++) {
        // Sélectionner aléatoirement un utilisateur et une entreprise
        const user = users[Math.floor(Math.random() * users.length)]
        const company = companies[Math.floor(Math.random() * companies.length)]

        // Sélectionner aléatoirement un template
        let template =
          companyNoteTemplates[Math.floor(Math.random() * companyNoteTemplates.length)]

        // Remplacer les variables dans le template
        const companyName = company.get("name")
        const industry = industries[Math.floor(Math.random() * industries.length)]
        const employees = (Math.floor(Math.random() * 19) + 2) * 50
        const budget = (Math.floor(Math.random() * 9) + 2) * 10000
        const competitor = competitors[Math.floor(Math.random() * competitors.length)]
        const months = Math.floor(Math.random() * 11) + 1
        const date = randomDateString()
        const process = processes[Math.floor(Math.random() * processes.length)]
        const growth = Math.floor(Math.random() * 20) + 5
        const market = markets[Math.floor(Math.random() * markets.length)]
        const problem1 = problems[Math.floor(Math.random() * problems.length)]
        const problem2 = problems[Math.floor(Math.random() * problems.length)]
        const problem3 = problems[Math.floor(Math.random() * problems.length)]
        const amount = (Math.floor(Math.random() * 9) + 1) * 1000
        const frequency = frequencies[Math.floor(Math.random() * frequencies.length)]

        template = template
          .replace("{company}", companyName as string)
          .replace("{industry}", industry)
          .replace("{employees}", employees.toString())
          .replace("{budget}", budget.toString())
          .replace("{competitor}", competitor)
          .replace("{months}", months.toString())
          .replace("{date}", date)
          .replace("{process}", process)
          .replace("{growth}", growth.toString())
          .replace("{market}", market)
          .replace("{problem1}", problem1)
          .replace("{problem2}", problem2)
          .replace("{problem3}", problem3)
          .replace("{amount}", amount.toString())
          .replace("{frequency}", frequency)

        // Créer la note
        const noteData = {
          id: uuidv4(),
          content: template,
          contactId: null,
          companyId: company.get("id"),
          createdById: user.get("id"),
          tenantId: tenantId,
          createdAt: randomDateInPast(60),
          updatedAt: randomDateInPast(30),
        }

        notesToCreate.push(noteData)
      }
    }

    // Créer les notes
    console.log(`Creating ${notesToCreate.length} notes...`)
    for (const noteData of notesToCreate) {
      await Note.create(noteData)
    }

    console.log(`Created ${notesToCreate.length} notes successfully`)
  } catch (error) {
    console.error("Error seeding notes:", error)
    throw error
  }
}

// Fonction utilitaire pour générer une date aléatoire dans le passé
function randomDateInPast(maxDaysAgo: number): Date {
  const today = new Date()
  const pastDate = new Date(today)
  pastDate.setDate(today.getDate() - Math.floor(Math.random() * maxDaysAgo))

  // Ajouter des heures, minutes et secondes aléatoires
  pastDate.setHours(Math.floor(Math.random() * 24))
  pastDate.setMinutes(Math.floor(Math.random() * 60))
  pastDate.setSeconds(Math.floor(Math.random() * 60))

  return pastDate
}

// Fonction utilitaire pour générer une date aléatoire au format string
function randomDateString(): string {
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ]
  const month = months[Math.floor(Math.random() * months.length)]
  const day = Math.floor(Math.random() * 28) + 1

  return `${day} ${month}`
}
