import { Context } from "koa"
import { Role, User } from "../models"

export const getAllRoles = async (ctx: Context) => {
  try {
    const roles = await Role.findAll({
      include: [User],
    })
    ctx.body = roles
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getRoleById = async (ctx: Context) => {
  try {
    const role = await Role.findByPk(ctx.params.id, {
      include: [User],
    })
    if (!role) {
      ctx.status = 404
      ctx.body = { error: "Role not found" }
      return
    }
    ctx.body = role
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getRolesByTenant = async (ctx: Context) => {
  try {
    const roles = await Role.findAll({
      where: {
        tenantId: ctx.params.tenantId,
      },
    })
    ctx.body = roles
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const createRole = async (ctx: Context) => {
  try {
    const role = await Role.create((ctx.request as any).body)
    ctx.status = 201
    ctx.body = role
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const updateRole = async (ctx: Context) => {
  try {
    const role = await Role.findByPk(ctx.params.id)
    if (!role) {
      ctx.status = 404
      ctx.body = { error: "Role not found" }
      return
    }
    await role.update((ctx.request as any).body)
    ctx.body = role
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const deleteRole = async (ctx: Context) => {
  try {
    const role = await Role.findByPk(ctx.params.id)
    if (!role) {
      ctx.status = 404
      ctx.body = { error: "Role not found" }
      return
    }
    await role.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
