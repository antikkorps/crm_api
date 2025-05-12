import { Context } from "koa"
import { Op } from "sequelize"
import { Speciality } from "../models"
import { paginatedQuery } from "../utils/pagination"

/**
 * Récupérer toutes les spécialités
 */
export const getAllSpecialities = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Speciality, ctx, {})

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Récupérer une spécialité par son ID
 */
export const getSpecialityById = async (ctx: Context) => {
  try {
    const speciality = await Speciality.findByPk(ctx.params.id)
    if (!speciality) {
      ctx.status = 404
      ctx.body = { error: "Speciality not found" }
      return
    }

    ctx.body = speciality
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Créer une nouvelle spécialité
 */
export const createSpeciality = async (ctx: Context) => {
  try {
    const speciality = await Speciality.create((ctx.request as any).body)
    ctx.status = 201
    ctx.body = speciality
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Mettre à jour une spécialité existante
 */
export const updateSpeciality = async (ctx: Context) => {
  try {
    const speciality = await Speciality.findByPk(ctx.params.id)
    if (!speciality) {
      ctx.status = 404
      ctx.body = { error: "Speciality not found" }
      return
    }

    await speciality.update((ctx.request as any).body)
    ctx.body = speciality
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Supprimer une spécialité
 */
export const deleteSpeciality = async (ctx: Context) => {
  try {
    const speciality = await Speciality.findByPk(ctx.params.id)
    if (!speciality) {
      ctx.status = 404
      ctx.body = { error: "Speciality not found" }
      return
    }

    await speciality.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Rechercher des spécialités par nom
 */
export const searchSpecialities = async (ctx: Context) => {
  try {
    const { name } = ctx.query

    const whereClause: any = {}

    if (name) {
      whereClause.name = { [Op.iLike]: `%${name}%` }
    }

    const result = await paginatedQuery(Speciality, ctx, {
      where: whereClause,
      order: [["name", "ASC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
