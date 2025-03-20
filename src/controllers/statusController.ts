import { Context } from "koa"
import { Company, Contact, Status } from "../models"
import { paginatedQuery } from "../utils/pagination"

export const getAllStatuses = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Status, ctx, {
      where: { tenantId: ctx.state.user.tenantId },
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getStatusById = async (ctx: Context) => {
  try {
    const status = await Status.findByPk(ctx.params.id)
    if (!status) {
      ctx.status = 404
      ctx.body = { error: "Status not found" }
      return
    }
    ctx.body = status
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getStatusesByTenant = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Status, ctx, {
      where: {
        tenantId: ctx.params.tenantId,
      },
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getStatusesByType = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Status, ctx, {
      where: {
        type: ctx.params.type,
        tenantId: ctx.query.tenantId || ctx.state.user.tenantId,
      },
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const createStatus = async (ctx: Context) => {
  try {
    const status = await Status.create((ctx.request as any).body)
    ctx.status = 201
    ctx.body = status
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const updateStatus = async (ctx: Context) => {
  try {
    const status = await Status.findByPk(ctx.params.id)
    if (!status) {
      ctx.status = 404
      ctx.body = { error: "Status not found" }
      return
    }
    await status.update((ctx.request as any).body)
    ctx.body = status
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const deleteStatus = async (ctx: Context) => {
  try {
    const status = await Status.findByPk(ctx.params.id)
    if (!status) {
      ctx.status = 404
      ctx.body = { error: "Status not found" }
      return
    }

    // Vérifier si le statut est utilisé par des contacts ou des entreprises
    const contactCount = await Contact.count({ where: { statusId: ctx.params.id } })
    const companyCount = await Company.count({ where: { statusId: ctx.params.id } })

    if (contactCount > 0 || companyCount > 0) {
      ctx.status = 400
      ctx.body = {
        error: "Cannot delete status that is in use",
        usage: { contacts: contactCount, companies: companyCount },
      }
      return
    }

    await status.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
