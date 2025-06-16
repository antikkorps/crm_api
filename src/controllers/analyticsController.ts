import { Context } from "koa"
import { Op, Sequelize } from "sequelize"
import {
  Activity,
  Company,
  Contact,
  Opportunity,
  Reminder,
  Status,
  User,
} from "../models"
import type { StatusResult, UserResult } from "../types/results"
/**
 * Obtenir un résumé global pour le dashboard
 */
export const getDashboardSummary = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId

    // Obtenir les statistiques de base
    const contactCount = await Contact.count({ where: { tenantId } })
    const companyCount = await Company.count({ where: { tenantId } })
    const noteCount = await Activity.count({ where: { tenantId, type: "NOTE" } })

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
    const noteTrends = await Activity.findAll({
      where: {
        tenantId,
        type: "NOTE",
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
        const notesCount = await Activity.count({
          where: {
            tenantId,
            type: "NOTE",
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

/**
 * Get pipeline data (opportunities by status)
 */
export const getOpportunitiesPipeline = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId

    // Get opportunity statuses of type "OPPORTUNITY"
    const statuses = await Status.findAll({
      where: {
        tenantId,
        type: "OPPORTUNITY",
      },
      order: [["order", "ASC"]],
      attributes: ["id", "name", "color"],
    })

    // For each status, count opportunities and calculate total value
    const pipelineStages = await Promise.all(
      statuses.map(async (status) => {
        const statusId = status.get("id")

        // Get count of opportunities with this status
        const count = await Opportunity.count({
          where: {
            tenantId,
            statusId,
          } as any, // Type casting to avoid WhereOptions error
        })

        // Calculate total value of opportunities with this status
        const valueResult = await Opportunity.findOne({
          where: {
            tenantId,
            statusId,
          } as any,
          attributes: [[Sequelize.fn("SUM", Sequelize.col("value")), "totalValue"]],
          raw: true,
        })

        const value =
          valueResult && "totalValue" in valueResult
            ? Number(valueResult.totalValue) || 0
            : 0

        return {
          name: status.get("name"),
          count,
          value,
          color: status.get("color"),
        }
      })
    )

    ctx.body = { items: pipelineStages }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      message: "Error fetching pipeline data",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Get opportunities by month
 */
export const getOpportunitiesByMonth = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId

    // Get the last 6 months
    const today = new Date()
    const monthNames = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ]

    // Define explicit type for months array
    interface MonthData {
      name: string
      year: number
      month: number
    }

    const months: MonthData[] = []

    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1)
      months.push({
        name: monthNames[month.getMonth()],
        year: month.getFullYear(),
        month: month.getMonth(),
      })
    }

    // Get opportunity statuses
    const statuses = await Status.findAll({
      where: {
        tenantId,
        type: "OPPORTUNITY",
      },
      order: [["order", "ASC"]],
      attributes: ["id", "name", "color"],
    })

    // Prepare series data
    const series = await Promise.all(
      statuses.map(async (status) => {
        const statusId = status.get("id") as string

        const data = await Promise.all(
          months.map(async (monthData) => {
            const startDate = new Date(monthData.year, monthData.month, 1)
            const endDate = new Date(monthData.year, monthData.month + 1, 0)

            // Count opportunities created in this month with this status
            const count = await Opportunity.count({
              where: {
                tenantId,
                statusId,
                createdAt: {
                  [Op.gte]: startDate,
                  [Op.lte]: endDate,
                },
              } as any, // Type casting to avoid WhereOptions error
            })

            return count
          })
        )

        return {
          name: status.get("name"),
          data,
        }
      })
    )

    ctx.body = {
      categories: months.map((m) => m.name),
      series,
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      message: "Error fetching monthly opportunities",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Get opportunities value summary
 */
export const getOpportunitiesValueSummary = async (ctx: Context) => {
  try {
    const tenantId = ctx.state.user.tenantId

    // Get total count of opportunities
    const totalCount = await Opportunity.count({
      where: { tenantId },
    })

    // Calculate total value of opportunities
    const totalValueResult = await Opportunity.findOne({
      where: { tenantId },
      attributes: [[Sequelize.fn("SUM", Sequelize.col("value")), "totalValue"]],
      raw: true,
    })

    const totalValue =
      totalValueResult && "totalValue" in totalValueResult
        ? Number(totalValueResult.totalValue) || 0
        : 0

    // Calculate weighted value (by probability) of opportunities
    const weightedValueResult = await Opportunity.findOne({
      where: { tenantId },
      attributes: [
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal("COALESCE(value * COALESCE(probability, 50) / 100, 0)")
          ),
          "weightedValue",
        ],
      ],
      raw: true,
    })

    const weightedValue =
      weightedValueResult && "weightedValue" in weightedValueResult
        ? Number(weightedValueResult.weightedValue) || 0
        : 0

    const statusResults = (await Opportunity.findAll({
      where: { tenantId },
      attributes: [
        "statusId",
        [Sequelize.fn("COUNT", Sequelize.col("Opportunity.id")), "count"],
        [Sequelize.fn("SUM", Sequelize.col("Opportunity.value")), "totalValue"],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              'COALESCE("Opportunity"."value" * COALESCE("Opportunity"."probability", 50) / 100, 0)'
            )
          ),
          "weightedValue",
        ],
      ],
      include: [
        {
          model: Status,
          attributes: ["name", "color"],
          required: true,
          as: "Status",
        },
      ],
      group: ["statusId", "Status.id", "Status.name", "Status.color"],
      raw: true,
      nest: true,
    })) as unknown as StatusResult[]

    const byStatus = statusResults.map((result) => ({
      statusId: result.statusId,
      name: result.Status.name,
      color: result.Status.color,
      count: Number(result["count"]),
      totalValue: Number(result["totalValue"]) || 0,
      weightedValue: Number(result["weightedValue"]) || 0,
      averageValue:
        Number(result["count"]) > 0
          ? Number(result["totalValue"]) / Number(result["count"])
          : 0,
    }))

    const userResults = (await Opportunity.findAll({
      where: { tenantId },
      attributes: [
        "assignedToId",
        [Sequelize.fn("COUNT", Sequelize.col("Opportunity.id")), "count"],
        [Sequelize.fn("SUM", Sequelize.col("Opportunity.value")), "totalValue"],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              'COALESCE("Opportunity"."value" * COALESCE("Opportunity"."probability", 50) / 100, 0)'
            )
          ),
          "weightedValue",
        ],
      ],
      include: [
        {
          model: User,
          as: "assignedTo",
          attributes: ["firstName", "lastName"],
          required: true,
        },
      ],
      group: [
        "assignedToId",
        "assignedTo.id",
        "assignedTo.firstName",
        "assignedTo.lastName",
      ],
      raw: true,
      nest: true,
    })) as unknown as UserResult[]

    const byUser = userResults.map((result) => ({
      userId: result.assignedToId,
      name: `${result.assignedTo.firstName} ${result.assignedTo.lastName}`,
      count: Number(result.count),
      totalValue: Number(result.totalValue) || 0,
      weightedValue: Number(result.weightedValue) || 0,
    }))

    ctx.body = {
      summary: {
        totalCount,
        totalValue,
        weightedValue,
        averageValue: totalCount > 0 ? totalValue / totalCount : 0,
      },
      byStatus,
      byUser,
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      message: "Error fetching opportunities value summary",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
