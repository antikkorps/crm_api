import { Context } from "koa"
import { Op } from "sequelize"
import { sequelize } from "../config/database"
import { Company, Contact, Opportunity, Status, User } from "../models"
import { paginatedQuery } from "../utils/pagination"

export const getAllCompanies = async (ctx: Context) => {
  try {
    // D'abord, trouvons les ID de statuts correspondant à "Won" ou "Gagné"
    const wonStatuses = await Status.findAll({
      attributes: ["id"],
      where: {
        type: "OPPORTUNITY",
        name: { [Op.iLike]: "%won%" }, // Pourrait être "Won", "Closed Won", "Gagné", etc.
      },
    })

    const wonStatusIds: string[] = wonStatuses.map((status) => status.get("id") as string)

    if (wonStatusIds.length === 0) {
      console.warn(
        'Aucun statut "Won" trouvé pour les opportunités. Le calcul du revenu généré pourrait être incorrect.'
      )
    }

    // Récupérer les entreprises sans calcul du revenu
    const result = await paginatedQuery(Company, ctx, {
      include: [
        { model: Status, as: "status" },
        { model: User, as: "assignedTo" },
      ],
      where: { tenantId: ctx.state.user.tenantId },
    })

    // Si nous avons des résultats, récupérer les revenus générés pour chaque entreprise
    if (result.items.length > 0) {
      const companyIds: string[] = result.items.map(
        (company) => company.get("id") as string
      )

      // Récupérer les sommes des opportunités gagnées par entreprise
      const opportunitySums = await Opportunity.findAll({
        attributes: ["companyId", [sequelize.fn("SUM", sequelize.col("value")), "total"]],
        where: {
          companyId: { [Op.in]: companyIds },
          statusId: wonStatusIds.length > 0 ? { [Op.in]: wonStatusIds } : undefined,
        },
        group: ["companyId"],
      })

      // Créer un Map pour un accès rapide aux totaux par ID d'entreprise
      const revenueByCompanyId = new Map()
      opportunitySums.forEach((sum) => {
        revenueByCompanyId.set(sum.get("companyId"), sum.get("total"))
      })

      // Ajouter le revenu généré à chaque entreprise
      result.items = result.items.map((company) => {
        const companyJson = company.toJSON()
        companyJson.generatedRevenue = revenueByCompanyId.get(company.get("id")) || 0
        return companyJson
      })
    }

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getCompanyById = async (ctx: Context) => {
  try {
    // D'abord, trouvons les ID de statuts correspondant à "Won" ou "Gagné"
    const wonStatuses = await Status.findAll({
      attributes: ["id"],
      where: {
        type: "OPPORTUNITY",
        name: { [Op.iLike]: "%won%" }, // Pourrait être "Won", "Closed Won", "Gagné", etc.
      },
    })

    const wonStatusIds: (string | number)[] = wonStatuses.map(
      (status) => status.get("id") as string | number
    )

    if (wonStatusIds.length === 0) {
      console.warn(
        'Aucun statut "Won" trouvé pour les opportunités. Le calcul du revenu généré pourrait être incorrect.'
      )
    }

    // Récupérer l'entreprise avec ses relations
    const company = await Company.findByPk(ctx.params.id, {
      include: [
        { model: Status, as: "status" },
        { model: User, as: "assignedTo" },
        { model: Contact },
      ],
    })

    if (!company) {
      ctx.status = 404
      ctx.body = { error: "Company not found" }
      return
    }

    // Récupérer le revenu généré séparément
    const generatedRevenue =
      (await Opportunity.sum("value", {
        where: {
          companyId: ctx.params.id,
          ...(wonStatusIds.length > 0 ? { statusId: { [Op.in]: wonStatusIds } } : {}),
        },
      })) || 0

    // Combiner les données
    const responseData = company.toJSON()
    responseData.generatedRevenue = generatedRevenue

    ctx.body = responseData
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getCompaniesByTenant = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Company, ctx, {
      where: {
        tenantId: ctx.params.tenantId,
      },
      include: [
        { model: Status, as: "status" },
        { model: User, as: "assignedTo" },
      ],
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const createCompany = async (ctx: Context) => {
  try {
    const company = await Company.create((ctx.request as any).body)
    ctx.status = 201
    ctx.body = company
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const updateCompany = async (ctx: Context) => {
  try {
    const company = await Company.findByPk(ctx.params.id)
    if (!company) {
      ctx.status = 404
      ctx.body = { error: "Company not found" }
      return
    }
    await company.update((ctx.request as any).body)
    ctx.body = company
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const deleteCompany = async (ctx: Context) => {
  try {
    const company = await Company.findByPk(ctx.params.id)
    if (!company) {
      ctx.status = 404
      ctx.body = { error: "Company not found" }
      return
    }
    await company.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const searchCompanies = async (ctx: Context) => {
  try {
    const { query } = ctx
    const whereClause: any = {
      tenantId: ctx.state.user.tenantId,
    }

    // Ajouter les filtres à partir des paramètres de requête
    if (query.name) whereClause.name = { [Op.iLike]: `%${query.name}%` }
    if (query.industry) whereClause.industry = { [Op.iLike]: `%${query.industry}%` }
    if (query.city) whereClause.city = { [Op.iLike]: `%${query.city}%` }
    if (query.country) whereClause.country = { [Op.iLike]: `%${query.country}%` }
    if (query.size) whereClause.size = { [Op.eq]: query.size }

    // Filtrage par globalRevenue (min et max)
    if (query.minRevenue)
      whereClause.globalRevenue = {
        ...whereClause.globalRevenue,
        [Op.gte]: Number(query.minRevenue),
      }
    if (query.maxRevenue)
      whereClause.globalRevenue = {
        ...whereClause.globalRevenue,
        [Op.lte]: Number(query.maxRevenue),
      }

    // Filtrage par statut
    if (query.statusId) whereClause.statusId = query.statusId

    // Filtrage par utilisateur assigné
    if (query.assignedToId) whereClause.assignedToId = query.assignedToId

    // Récupérer les entreprises avec les filtres appliqués
    const result = await paginatedQuery(Company, ctx, {
      include: [
        { model: Status, as: "status" },
        { model: User, as: "assignedTo" },
      ],
      where: whereClause,
      order: [["name", "ASC"]],
    })

    // Récupérer les ID de statuts correspondant à "Won" pour calculer le revenu généré
    if (result.items.length > 0) {
      const wonStatuses = await Status.findAll({
        attributes: ["id"],
        where: {
          type: "OPPORTUNITY",
          name: { [Op.iLike]: "%won%" },
        },
      })

      const wonStatusIds: string[] = wonStatuses.map(
        (status) => status.get("id") as string
      )
      const companyIds: string[] = result.items.map(
        (company) => company.get("id") as string
      )

      // Récupérer les sommes des opportunités gagnées par entreprise
      const opportunitySums = await Opportunity.findAll({
        attributes: ["companyId", [sequelize.fn("SUM", sequelize.col("value")), "total"]],
        where: {
          companyId: { [Op.in]: companyIds },
          statusId: wonStatusIds.length > 0 ? { [Op.in]: wonStatusIds } : undefined,
        },
        group: ["companyId"],
      })

      // Créer un Map pour un accès rapide aux totaux par ID d'entreprise
      const revenueByCompanyId = new Map()
      opportunitySums.forEach((sum) => {
        revenueByCompanyId.set(sum.get("companyId"), sum.get("total"))
      })

      // Ajouter le revenu généré à chaque entreprise
      result.items = result.items.map((company) => {
        const companyJson = company.toJSON()
        companyJson.generatedRevenue = revenueByCompanyId.get(company.get("id")) || 0
        return companyJson
      })
    }

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
