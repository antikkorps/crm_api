import { Context } from "koa"
import { Op } from "sequelize"
import { sequelize } from "../config/database"
import { Company, Contact, Opportunity, Speciality, Status, User } from "../models"
import { paginatedQuery } from "../utils/pagination"

export const getAllCompanies = async (ctx: Context) => {
  try {
    const { query } = ctx

    // Détection automatique des filtres (exclure seulement les paramètres de pagination)
    const hasSearchFilters = Object.keys(query).some(
      (key) => key !== "page" && key !== "limit" && key !== "offset"
    )

    if (hasSearchFilters) {
      // Utiliser la logique de recherche si des filtres sont présents
      return await searchCompanies(ctx)
    }

    // Logique getAll (sans filtres) - code existant
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
        { model: Speciality, through: { attributes: [] } },
        { model: Contact },
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

    // Suggestion d'élargir la recherche si peu de résultats (même logique que searchCompanies)
    // Ne pas afficher de suggestion si limit=-1 (on a déjà tous les résultats)
    const isLimitDisabled = parseInt(ctx.query.limit as string) === -1

    if (!isLimitDisabled && result.pagination.totalItems < 5) {
      // Récupérer le nombre total d'entreprises sans filtre
      const totalCompanies = await Company.count({
        where: { tenantId: ctx.state.user.tenantId },
      })
      // Construire l'URL pour récupérer toutes les entreprises
      const baseUrl = ctx.request.url.split("?")[0]
      const expandUrl = `${baseUrl}?limit=-1`
      // Construire l'URL pour reset la pagination (page=1)
      const currentUrl = new URL(ctx.request.url, ctx.request.origin)
      currentUrl.searchParams.set("page", "1")
      const resetUrl = `${baseUrl}?${currentUrl.searchParams.toString()}`
      ctx.body = {
        ...result,
        suggestion: {
          shouldExpand: true,
          shouldResetPagination: result.pagination.currentPage > 1,
          filteredCount: result.pagination.totalItems,
          totalCount: totalCompanies,
          expandUrl: expandUrl,
          resetUrl: resetUrl,
          message:
            result.pagination.currentPage > 1
              ? `Seulement ${result.pagination.totalItems} résultat(s) trouvé(s) sur la page 1. Voulez-vous voir toutes les ${totalCompanies} entreprises ?`
              : `Seulement ${result.pagination.totalItems} résultat(s) trouvé(s). Voulez-vous voir toutes les ${totalCompanies} entreprises ?`,
        },
      }
      return
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
        { model: Speciality, through: { attributes: [] } },
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
        { model: Speciality, through: { attributes: [] } },
        { model: Contact },
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
    const requestBody = (ctx.request as any).body
    const { specialitiesIds, ...companyData } = requestBody

    // Créer l'entreprise
    const company = await Company.create(companyData)

    // Associer les spécialités si elles sont fournies
    if (specialitiesIds && specialitiesIds.length > 0) {
      await company.setSpecialities(specialitiesIds)
    }

    // Récupérer l'entreprise avec les spécialités associées
    const companyWithSpecialities = await Company.findByPk(company.get("id"), {
      include: [{ model: Speciality }],
    })

    ctx.status = 201
    ctx.body = companyWithSpecialities
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const updateCompany = async (ctx: Context) => {
  try {
    const requestBody = (ctx.request as any).body
    const { specialitiesIds, ...companyData } = requestBody

    const company = await Company.findByPk(ctx.params.id)
    if (!company) {
      ctx.status = 404
      ctx.body = { error: "Company not found" }
      return
    }

    // Mettre à jour les données de l'entreprise
    await company.update(companyData)

    // Mettre à jour les spécialités si fournies
    if (specialitiesIds !== undefined) {
      // @ts-ignore - On ignore l'erreur de type car cette méthode est générée par Sequelize
      await company.setSpecialities(specialitiesIds || [])
    }

    // Récupérer l'entreprise mise à jour avec les spécialités associées
    const updatedCompany = await Company.findByPk(ctx.params.id, {
      include: [
        { model: Status, as: "status" },
        { model: User, as: "assignedTo" },
        { model: Speciality, through: { attributes: [] } },
        { model: Contact },
      ],
    })

    ctx.body = updatedCompany
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
    const includeModels = []

    // Ajouter les filtres à partir des paramètres de requête
    if (query.name) whereClause.name = { [Op.iLike]: `%${query.name}%` }
    if (query.industry) whereClause.industry = { [Op.iLike]: `%${query.industry}%` }
    if (query.city) whereClause.city = { [Op.iLike]: `%${query.city}%` }
    if (query.country) whereClause.country = { [Op.iLike]: `%${query.country}%` }
    if (query.size) whereClause.size = { [Op.eq]: query.size }
    if (query.client_number)
      whereClause.client_number = { [Op.iLike]: `%${query.client_number}%` }
    if (query.client_group)
      whereClause.client_group = { [Op.iLike]: `%${query.client_group}%` }
    if (query.code_regional)
      whereClause.code_regional = { [Op.iLike]: `%${query.code_regional}%` }

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

    // Filtrage par statut - accepter à la fois statusId et status
    if (query.statusId) {
      whereClause.statusId = query.statusId
    } else if (query.status) {
      // Filtrer par le nom du statut
      includeModels.push({
        model: Status,
        as: "status",
        where: { name: { [Op.iLike]: `%${query.status}%` } },
        required: true,
      })
    }

    // Filtrage par utilisateur assigné
    if (query.assignedToId) whereClause.assignedToId = query.assignedToId

    // Ajouter filtre pour les salles d'opération
    // Traiter operatingRooms null comme 0 pour le filtrage
    if (query.minOperatingRooms !== undefined || query.maxOperatingRooms !== undefined) {
      // Créer une condition qui traite NULL comme 0
      const operatingRoomsCondition = sequelize.literal(
        `COALESCE("Company"."operatingRooms", 0)`
      )

      if (query.minOperatingRooms !== undefined) {
        whereClause.operatingRooms = sequelize.where(operatingRoomsCondition, {
          [Op.gte]: Number(query.minOperatingRooms),
        })
      }

      if (query.maxOperatingRooms !== undefined) {
        if (whereClause.operatingRooms) {
          // Si déjà défini par minOperatingRooms, ajouter la condition max
          whereClause.operatingRooms = sequelize.and(
            whereClause.operatingRooms,
            sequelize.where(operatingRoomsCondition, {
              [Op.lte]: Number(query.maxOperatingRooms),
            })
          )
        } else {
          // Sinon, définir directement
          whereClause.operatingRooms = sequelize.where(operatingRoomsCondition, {
            [Op.lte]: Number(query.maxOperatingRooms),
          })
        }
      }
    }

    // Filtrer par spécialités - accepter plusieurs formats de paramètres
    const specialityFilter =
      query.speciality ||
      query.specialityId ||
      query.specialities ||
      query.specialitiesIds

    if (specialityFilter) {
      let specialityCondition: any = {}

      // Si c'est un ID
      if (
        typeof specialityFilter === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          specialityFilter
        )
      ) {
        specialityCondition.id = specialityFilter
      }
      // Sinon, chercher par nom
      else {
        specialityCondition.name = { [Op.iLike]: `%${specialityFilter}%` }
      }

      // Pour les relations many-to-many, assurez-vous que required: true pour forcer l'inner join
      includeModels.push({
        model: Speciality,
        where: specialityCondition,
        through: { attributes: [] },
        required: true, // Force inner join pour filtrer correctement
      })
    } else {
      // Toujours inclure les spécialités, mais sans filtre
      includeModels.push({
        model: Speciality,
        through: { attributes: [] },
        required: false, // Permet left join pour inclure toutes les entreprises
      })
    }

    // Vérifier si nous avons déjà un include pour Status dans includeModels
    const hasStatusInclude = includeModels.some((model) => model.model === Status)
    const statusInclude = hasStatusInclude ? [] : [{ model: Status, as: "status" }]

    // Récupérer les entreprises avec les filtres appliqués
    const result = await paginatedQuery(Company, ctx, {
      include: [...statusInclude, { model: User, as: "assignedTo" }, ...includeModels],
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

    // Ajouter une suggestion d'élargir la recherche si peu de résultats
    // Ne pas afficher de suggestion si limit=-1 (on a déjà tous les résultats)
    const isLimitDisabled = parseInt(ctx.query.limit as string) === -1

    if (!isLimitDisabled && result.pagination.totalItems < 5) {
      // Récupérer le nombre total d'entreprises sans filtre
      const totalCompanies = await Company.count({
        where: { tenantId: ctx.state.user.tenantId },
      })

      // Construire l'URL pour récupérer toutes les entreprises
      const baseUrl = ctx.request.url.split("?")[0]
      const expandUrl = `${baseUrl}?limit=-1`

      // Construire l'URL pour reset la pagination (page=1)
      const currentUrl = new URL(ctx.request.url, ctx.request.origin)
      currentUrl.searchParams.set("page", "1")
      const resetUrl = `${baseUrl}?${currentUrl.searchParams.toString()}`

      ctx.body = {
        ...result,
        suggestion: {
          shouldExpand: true,
          shouldResetPagination: result.pagination.currentPage > 1,
          filteredCount: result.pagination.totalItems,
          totalCount: totalCompanies,
          expandUrl: expandUrl,
          resetUrl: resetUrl,
          message:
            result.pagination.currentPage > 1
              ? `Seulement ${result.pagination.totalItems} résultat(s) trouvé(s) sur la page 1. Voulez-vous voir toutes les ${totalCompanies} entreprises ?`
              : `Seulement ${result.pagination.totalItems} résultat(s) trouvé(s). Voulez-vous voir toutes les ${totalCompanies} entreprises ?`,
        },
      }
    } else {
      ctx.body = result
    }
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
/**
 * Ajouter des spécialités à une entreprise
 */
export const addSpecialitiesToCompany = async (ctx: Context) => {
  try {
    const companyId = ctx.params.id
    const { specialityIds } = (ctx.request as any).body

    if (!specialityIds || !Array.isArray(specialityIds) || specialityIds.length === 0) {
      ctx.status = 400
      ctx.body = { error: "specialityIds doit être un tableau non vide d'identifiants" }
      return
    }

    // Vérifier que l'entreprise existe
    const company = await Company.findByPk(companyId)
    if (!company) {
      ctx.status = 404
      ctx.body = { error: "Entreprise non trouvée" }
      return
    }

    // Vérifier que toutes les spécialités existent
    const specialities = await Speciality.findAll({
      where: { id: { [Op.in]: specialityIds } },
    })

    if (specialities.length !== specialityIds.length) {
      ctx.status = 400
      ctx.body = { error: "Une ou plusieurs spécialités n'existent pas" }
      return
    }

    // Ajouter les spécialités à l'entreprise
    // @ts-ignore - On ignore l'erreur de type car cette méthode est générée par Sequelize
    await company.addSpecialities(specialityIds)

    // Récupérer l'entreprise mise à jour avec ses spécialités
    const updatedCompany = await Company.findByPk(companyId, {
      include: [{ model: Speciality }],
    })

    ctx.body = updatedCompany
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Supprimer des spécialités d'une entreprise
 */
export const removeSpecialitiesFromCompany = async (ctx: Context) => {
  try {
    const companyId = ctx.params.id
    const { specialityIds } = (ctx.request as any).body

    if (!specialityIds || !Array.isArray(specialityIds) || specialityIds.length === 0) {
      ctx.status = 400
      ctx.body = { error: "specialityIds doit être un tableau non vide d'identifiants" }
      return
    }

    // Vérifier que l'entreprise existe
    const company = await Company.findByPk(companyId)
    if (!company) {
      ctx.status = 404
      ctx.body = { error: "Entreprise non trouvée" }
      return
    }

    // Supprimer les spécialités de l'entreprise
    // @ts-ignore - On ignore l'erreur de type car cette méthode est générée par Sequelize
    await company.removeSpecialities(specialityIds)

    // Récupérer l'entreprise mise à jour avec ses spécialités
    const updatedCompany = await Company.findByPk(companyId, {
      include: [{ model: Speciality }],
    })

    ctx.body = updatedCompany
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
