import { Context } from "koa"
import { Role, User } from "../models"
import { paginatedQuery } from "../utils/pagination"

export const getAllUsers = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(User, ctx, {
      include: Role,
      where: { tenantId: ctx.state.user.tenantId },
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getUserById = async (ctx: Context) => {
  try {
    const user = await User.findByPk(ctx.params.id, {
      include: Role,
    })
    if (!user) {
      ctx.status = 404
      ctx.body = { error: "User not found" }
      return
    }
    ctx.body = user
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getUsersByTenant = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(User, ctx, {
      where: {
        tenantId: ctx.params.tenantId,
      },
      include: Role,
    })

    ctx.body = result
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const createUser = async (ctx: Context) => {
  try {
    const user = await User.create((ctx.request as any).body)
    ctx.status = 201
    ctx.body = user
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const updateUser = async (ctx: Context) => {
  try {
    const user = await User.findByPk(ctx.params.id)
    if (!user) {
      ctx.status = 404
      ctx.body = { error: "User not found" }
      return
    }
    await user.update((ctx.request as any).body)
    ctx.body = user
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const deleteUser = async (ctx: Context) => {
  try {
    const user = await User.findByPk(ctx.params.id)
    if (!user) {
      ctx.status = 404
      ctx.body = { error: "User not found" }
      return
    }
    await user.destroy()
    ctx.status = 204
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}
