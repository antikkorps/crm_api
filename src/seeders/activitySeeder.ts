import { v4 as uuidv4 } from "uuid"
import { Activity, Company, Contact, User } from "../models"

export const seedActivities = async (tenantId: string) => {
  try {
    console.log("Seeding activities...")

    // Vérifier si des activités existent déjà pour ce tenant
    const activityCount = await Activity.count({ where: { tenantId } })

    if (activityCount > 0) {
      console.log(
        `Skipping activity seeding: ${activityCount} activities already exist for tenant`
      )
      return
    }

    // Récupérer quelques utilisateurs, contacts et entreprises pour les activités
    const users = await User.findAll({ where: { tenantId }, limit: 5 })
    if (users.length === 0) {
      console.log("No users found for activity seeding, skipping...")
      return
    }

    const contacts = await Contact.findAll({ where: { tenantId }, limit: 10 })
    if (contacts.length === 0) {
      console.log("No contacts found for activity seeding, skipping...")
      return
    }

    const companies = await Company.findAll({ where: { tenantId }, limit: 5 })

    // Types d'activités à créer
    const activityTypes = [
      {
        type: "CALL",
        templates: [
          {
            title: "Appel de prise de contact",
            content: "Premier appel avec le prospect pour présenter nos services.",
          },
          {
            title: "Appel de suivi",
            content:
              "Appel de suivi après l'envoi du devis pour répondre aux questions éventuelles.",
          },
          {
            title: "Appel de relance",
            content: "Relance du prospect qui n'a pas donné suite au devis envoyé.",
          },
          {
            title: "Appel de négociation",
            content:
              "Discussion sur les tarifs et conditions de la proposition commerciale.",
          },
        ],
        extras: {
          callDirection: ["OUTBOUND", "INBOUND"],
          duration: [5, 10, 15, 20, 30, 45],
          callOutcome: ["POSITIVE", "NEGATIVE", "NEUTRAL", "CALLBACK_REQUIRED"],
        },
      },
      {
        type: "MEETING",
        templates: [
          {
            title: "Rendez-vous de découverte",
            content: "Première rencontre pour analyser les besoins du client.",
          },
          {
            title: "Démonstration produit",
            content: "Présentation détaillée de notre solution et ses fonctionnalités.",
          },
          {
            title: "Réunion de signature",
            content: "Finalisation du contrat et planification des prochaines étapes.",
          },
          {
            title: "Réunion de suivi trimestriel",
            content: "Point d'avancement sur le projet et recueil des feedbacks.",
          },
        ],
        extras: {
          location: [
            "Bureaux client",
            "Nos bureaux",
            "Visioconférence",
            "Café Le Central",
            "Restaurant Le Gourmet",
          ],
          attendees: ["Client seul", "Équipe client", "Équipe commerciale", "Direction"],
        },
      },
      {
        type: "TASK",
        templates: [
          {
            title: "Préparation du devis",
            content:
              "Élaboration d'une proposition commerciale adaptée aux besoins exprimés.",
          },
          {
            title: "Envoi du devis au client",
            content: "Transmission du devis par email avec note explicative.",
          },
          {
            title: "Création compte client",
            content: "Mise en place du compte client dans notre système.",
          },
          {
            title: "Rédaction contrat",
            content: "Préparation des documents contractuels selon les termes négociés.",
          },
        ],
        extras: {
          priority: ["LOW", "MEDIUM", "HIGH"],
          taskStatus: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
        },
      },
      {
        type: "EMAIL",
        templates: [
          {
            title: "Email de bienvenue",
            content: "Message de bienvenue et présentation des prochaines étapes.",
          },
          {
            title: "Envoi documentation",
            content: "Transmission des documents demandés lors de notre entretien.",
          },
          {
            title: "Confirmation de commande",
            content:
              "Confirmation de la réception de la commande et détails de livraison.",
          },
          {
            title: "Invitation webinaire",
            content:
              "Invitation à participer à notre prochain webinaire sur les nouvelles fonctionnalités.",
          },
        ],
        extras: {
          emailSubject: [
            "Bienvenue chez nous",
            "Votre documentation",
            "Confirmation de votre commande",
            "Invitation: découvrez nos nouveautés",
          ],
          emailStatus: ["DRAFT", "SENT", "OPENED", "CLICKED", "BOUNCED"],
        },
      },
      {
        type: "NOTE",
        templates: [
          {
            title: "Note de contact",
            content:
              "Premier contact établi. Très bon accueil, personne intéressée par nos services.",
          },
          {
            title: "Information importante",
            content:
              "Budget annuel confirmé à 15 000€. Décision attendue avant fin du mois.",
          },
          {
            title: "Feedback client",
            content:
              "Client satisfait de notre proposition mais souhaite négocier les délais.",
          },
          {
            title: "Point technique",
            content:
              "Spécifications techniques clarifiées. Intégration avec leur système ERP requise.",
          },
          {
            title: "Contexte concurrentiel",
            content:
              "Travaillent actuellement avec [concurrent]. Points de douleur identifiés : support client et coûts.",
          },
          {
            title: "Profil décisionnel",
            content:
              "Interlocuteur principal mais décision collégiale avec le comité de direction.",
          },
          {
            title: "Historique relation",
            content:
              "Ancien client de 2019 à 2021. Changement d'équipe, opportunité de renouer la relation.",
          },
          {
            title: "Urgence projet",
            content:
              "Projet à démarrer rapidement suite à une croissance inattendue de leur activité.",
          },
        ],
        extras: {},
      },
      {
        type: "NOTE",
        templates: [
          {
            title: "Opportunité gagnée",
            content:
              "Le client a accepté notre proposition. Contrat d'une valeur de 15 000€ sur 12 mois.",
          },
          {
            title: "Opportunité perdue",
            content:
              "Le client a choisi un concurrent. Raison principale: prix trop élevé.",
          },
          {
            title: "Information importante",
            content:
              "Le client change de siège social en septembre. Prévoir mise à jour des informations.",
          },
          {
            title: "Feedback client",
            content:
              "Client très satisfait de notre réactivité. Potentiel de recommandation élevé.",
          },
        ],
      },
    ]

    // Tableau pour stocker toutes les activités à créer
    const activitiesToCreate = []

    // Dates pour les activités (des plus anciennes aux plus récentes)
    const now = new Date()
    const dates = []
    for (let i = 0; i < 60; i++) {
      const date = new Date()
      date.setDate(now.getDate() - (60 - i))
      dates.push(date)
    }

    // Générer des activités
    for (let i = 0; i < 40; i++) {
      // Choisir un type d'activité aléatoire
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)]

      // Choisir un template aléatoire pour ce type
      const template =
        activityType.templates[Math.floor(Math.random() * activityType.templates.length)]

      // Choisir un utilisateur aléatoire
      const user = users[Math.floor(Math.random() * users.length)]

      // Choisir un contact aléatoire
      const contact = contacts[Math.floor(Math.random() * contacts.length)]

      // Choisir une entreprise aléatoire (si disponible) ou utiliser celle du contact
      let company = contact.get("companyId")
        ? null // Utiliser la relation existante
        : companies.length > 0
        ? companies[Math.floor(Math.random() * companies.length)]
        : null

      // Choisir une date aléatoire
      const date = dates[Math.floor(Math.random() * dates.length)]

      // Données de base de l'activité
      const activityData: any = {
        id: uuidv4(),
        type: activityType.type,
        title: template.title,
        content: template.content,
        tenantId,
        createdById: user.get("id"),
        assignedToId: user.get("id"),
        contactId: contact.get("id"),
        companyId: company ? company.get("id") : contact.get("companyId"),
        createdAt: date,
        updatedAt: date,
      }

      // Ajouter des extras spécifiques au type d'activité
      if (activityType.extras) {
        for (const [key, values] of Object.entries(activityType.extras)) {
          if (Array.isArray(values)) {
            activityData[key] = values[Math.floor(Math.random() * values.length)]
          }
        }
      }

      // Ajouter des dates spécifiques pour les réunions et les tâches
      if (activityType.type === "MEETING") {
        const startTime = new Date(date)
        startTime.setHours(9 + Math.floor(Math.random() * 8)) // Entre 9h et 17h
        activityData.startTime = startTime

        const endTime = new Date(startTime)
        endTime.setMinutes(
          startTime.getMinutes() + 30 * (1 + Math.floor(Math.random() * 4))
        ) // Entre 30min et 2h
        activityData.endTime = endTime
      } else if (activityType.type === "TASK") {
        const dueDate = new Date(date)
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7)) // Échéance entre 0 et 7 jours
        activityData.dueDate = dueDate

        // 70% de chance que la tâche soit complétée si la date est dans le passé
        if (dueDate < now && Math.random() < 0.7) {
          activityData.taskStatus = "COMPLETED"
        }
      }

      activitiesToCreate.push(activityData)
    }

    // Créer les activités une par une au lieu de bulk create
    console.log(`Creating ${activitiesToCreate.length} activities...`)
    for (const activityData of activitiesToCreate) {
      await Activity.create(activityData)
    }

    console.log(`Created ${activitiesToCreate.length} activities successfully`)
  } catch (error) {
    console.error("Error seeding activities:", error)
    throw error
  }
}
