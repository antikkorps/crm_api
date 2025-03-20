import { Context } from "koa"
import { Op, Sequelize } from "sequelize"
import { Company, Contact, Note, Reminder, Status, User } from "../models"

/**
 * Obtenir un résumé global pour le dashboard
 */
export const getDashboardSummary = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId

    // Obtenir les statistiques de base
    const contactCount = await Contact.count({ where: { tenantId } })
    const companyCount = await Company.count({ where: { tenantId } })
    const noteCount = await Note.count({ where: { tenantId } })

    // Rappels à venir pour l'utilisateur
    const upcomingReminders = await Reminder.count({
      where: {
        tenantId,
        assignedToId: ctx.state.user.id,
        isCompleted: false,
        dueDate: {
          [Op.gte]: new Date(),
        },
      },
    })

    // Rappels en retard pour l'utilisateur
    const overdueReminders = await Reminder.count({
      where: {
        tenantId,
        assignedToId: ctx.state.user.id,
        isCompleted: false,
        dueDate: {
          [Op.lt]: new Date(),
        },
      },
    })

    // Contacts récemment ajoutés (7 derniers jours)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const recentContacts = await Contact.count({
      where: {
        tenantId,
        createdAt: {
          [Op.gte]: oneWeekAgo,
        },
      },
    })

    // Entreprises récemment ajoutées (7 derniers jours)
    const recentCompanies = await Company.count({
      where: {
        tenantId,
        createdAt: {
          [Op.gte]: oneWeekAgo,
        },
      },
    })

    ctx.body = {
      counts: {
        contacts: contactCount,
        companies: companyCount,
        notes: noteCount,
        reminders: {
          upcoming: upcomingReminders,
          overdue: overdueReminders,
        },
      },
      recent: {
        contacts: recentContacts,
        companies: recentCompanies,
      },
    }
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Obtenir la distribution des statuts des contacts
 */
export const getContactStatusDistribution = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId

    // Récupérer tous les statuts de type CONTACT pour ce tenant
    const contactStatuses = await Status.findAll({
      where: {
        tenantId,
        type: "CONTACT",
      },
      attributes: ["id", "name", "color"],
    })

    // Pour chaque statut, compter le nombre de contacts
    const distribution = await Promise.all(
      contactStatuses.map(async (status) => {
        const count = await Contact.count({
          where: {
            tenantId,
            statusId: status.get("id"),
          },
        })

        return {
          statusId: status.get("id"),
          name: status.get("name"),
          color: status.get("color"),
          count,
        }
      })
    )

    ctx.body = distribution
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Obtenir la distribution des statuts des entreprises
 */
export const getCompanyStatusDistribution = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId

    // Récupérer tous les statuts de type COMPANY pour ce tenant
    const companyStatuses = await Status.findAll({
      where: {
        tenantId,
        type: "COMPANY",
      },
      attributes: ["id", "name", "color"],
    })

    // Pour chaque statut, compter le nombre d'entreprises
    const distribution = await Promise.all(
      companyStatuses.map(async (status) => {
        const count = await Company.count({
          where: {
            tenantId,
            statusId: status.get("id"),
          },
        })

        return {
          statusId: status.get("id"),
          name: status.get("name"),
          color: status.get("color"),
          count,
        }
      })
    )

    ctx.body = distribution
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Obtenir les tendances d'activité au fil du temps
 */
export const getActivityTrends = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId
    const { period = "month", months = "6" } = ctx.query as {
      period?: string
      months?: string
    }

    // Déterminer la date de début en fonction de la période
    const startDate = new Date()
    const numMonths = parseInt(months) || 6
    startDate.setMonth(startDate.getMonth() - numMonths)

    // Format de groupe par période (jour, semaine, mois)
    let dateExpression
    if (period === "day") {
      dateExpression = Sequelize.literal("TO_CHAR(\"createdAt\", 'YYYY-MM-DD')")
    } else if (period === "week") {
      // Pour les semaines, on utilise date_trunc
      dateExpression = Sequelize.literal(
        "TO_CHAR(DATE_TRUNC('week', \"createdAt\"), 'YYYY-MM-DD')"
      )
    } else {
      // Par mois (par défaut)
      dateExpression = Sequelize.literal("TO_CHAR(\"createdAt\", 'YYYY-MM')")
    }

    // Requête pour les contacts créés par période
    const contactTrends = await Contact.findAll({
      where: {
        tenantId,
        createdAt: {
          [Op.gte]: startDate,
        },
      },
      attributes: [
        [dateExpression, "period"],
        [Sequelize.fn("count", Sequelize.col("id")), "count"],
      ],
      group: ["period"],
      order: [[Sequelize.literal("period"), "ASC"]],
      raw: true,
    })

    // Requête pour les entreprises créées par période
    const companyTrends = await Company.findAll({
      where: {
        tenantId,
        createdAt: {
          [Op.gte]: startDate,
        },
      },
      attributes: [
        [dateExpression, "period"],
        [Sequelize.fn("count", Sequelize.col("id")), "count"],
      ],
      group: ["period"],
      order: [[Sequelize.literal("period"), "ASC"]],
      raw: true,
    })

    // Requête pour les notes créées par période
    const noteTrends = await Note.findAll({
      where: {
        tenantId,
        createdAt: {
          [Op.gte]: startDate,
        },
      },
      attributes: [
        [dateExpression, "period"],
        [Sequelize.fn("count", Sequelize.col("id")), "count"],
      ],
      group: ["period"],
      order: [[Sequelize.literal("period"), "ASC"]],
      raw: true,
    })

    ctx.body = {
      contacts: contactTrends,
      companies: companyTrends,
      notes: noteTrends,
      period,
      startDate,
    }
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Obtenir les performances par utilisateur
 */
export const getUserPerformance = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId

    // Obtenir tous les utilisateurs du tenant
    const users = await User.findAll({
      where: { tenantId, isActive: true },
      attributes: ["id", "firstName", "lastName", "email"],
    })

    // Pour chaque utilisateur, récupérer ses statistiques
    const userStats = await Promise.all(
      users.map(async (user) => {
        const userId = user.get("id")

        // Compter les contacts assignés à cet utilisateur
        const contactsCount = await Contact.count({
          where: {
            tenantId,
            assignedToId: userId,
          },
        })

        // Compter les entreprises assignées à cet utilisateur
        const companiesCount = await Company.count({
          where: {
            tenantId,
            assignedToId: userId,
          },
        })

        // Compter les notes créées par cet utilisateur
        const notesCount = await Note.count({
          where: {
            tenantId,
            createdById: userId,
          },
        })

        // Compter les rappels terminés par cet utilisateur
        const completedReminders = await Reminder.count({
          where: {
            tenantId,
            assignedToId: userId,
            isCompleted: true,
          },
        })

        // Compter les rappels en attente pour cet utilisateur
        const pendingReminders = await Reminder.count({
          where: {
            tenantId,
            assignedToId: userId,
            isCompleted: false,
          },
        })

        return {
          userId,
          firstName: user.get("firstName"),
          lastName: user.get("lastName"),
          email: user.get("email"),
          stats: {
            contacts: contactsCount,
            companies: companiesCount,
            notes: notesCount,
            reminders: {
              completed: completedReminders,
              pending: pendingReminders,
            },
          },
        }
      })
    )

    ctx.body = userStats
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Obtenir les statistiques des rappels
 */
export const getReminderStats = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId
    const userId = (ctx.query.userId as string) || ctx.state.user.id

    // Définir les périodes pour les statistiques
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    const nextMonth = new Date(today)
    nextMonth.setMonth(today.getMonth() + 1)

    // Statistiques des rappels pour aujourd'hui
    const todayReminders = await Reminder.count({
      where: {
        tenantId,
        assignedToId: userId,
        isCompleted: false,
        dueDate: {
          [Op.lt]: tomorrow,
          [Op.gte]: today,
        },
      },
    })

    // Statistiques des rappels pour cette semaine
    const thisWeekReminders = await Reminder.count({
      where: {
        tenantId,
        assignedToId: userId,
        isCompleted: false,
        dueDate: {
          [Op.lt]: nextWeek,
          [Op.gte]: today,
        },
      },
    })

    // Statistiques des rappels pour ce mois
    const thisMonthReminders = await Reminder.count({
      where: {
        tenantId,
        assignedToId: userId,
        isCompleted: false,
        dueDate: {
          [Op.lt]: nextMonth,
          [Op.gte]: today,
        },
      },
    })

    // Statistiques des rappels en retard
    const overdueReminders = await Reminder.count({
      where: {
        tenantId,
        assignedToId: userId,
        isCompleted: false,
        dueDate: {
          [Op.lt]: today,
        },
      },
    })

    // Statistiques des rappels de haute priorité
    const highPriorityReminders = await Reminder.count({
      where: {
        tenantId,
        assignedToId: userId,
        isCompleted: false,
        priority: "HIGH",
      },
    })

    ctx.body = {
      userId,
      counts: {
        today: todayReminders,
        thisWeek: thisWeekReminders,
        thisMonth: thisMonthReminders,
        overdue: overdueReminders,
        highPriority: highPriorityReminders,
      },
    }
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
