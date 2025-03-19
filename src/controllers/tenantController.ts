import { Context } from "koa"
import { Tenant } from "../models"

export const getAllTenants = async (ctx: Context) => {
  try {
    const tenants = await Tenant.findAll()
    ctx.body = tenants
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getTenantById = async (ctx: Context) => {
  try {
    const tenant = await Tenant.findByPk(ctx.params.id)
    if (!tenant) {
      ctx.status = 404
      ctx.body = { error: "Tenant not found" }
      return
    }
    ctx.body = tenant
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const createTenant = async (ctx: Context) => {
  try {
    const tenant = await Tenant.create((ctx.request as any).body)
    ctx.status = 201
    ctx.body = tenant
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const updateTenant = async (ctx: Context) => {
  try {
    const tenant = await Tenant.findByPk(ctx.params.id)
    if (!tenant) {
      ctx.status = 404
      ctx.body = { error: "Tenant not found" }
      return
    }
    await tenant.update((ctx.request as any).body)
    ctx.body = tenant
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const deleteTenant = async (ctx: Context) => {
  try {
    const tenant = await Tenant.findByPk(ctx.params.id)
    if (!tenant) {
      ctx.status = 404
      ctx.body = { error: "Tenant not found" }
      return
    }
    await tenant.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
