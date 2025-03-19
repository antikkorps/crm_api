import { Context } from "koa"
import { Company, Contact, Status, User } from "../models"

export const getAllCompanies = async (ctx: Context) => {
  try {
    const companies = await Company.findAll({
      include: [{ model: Status }, { model: User, as: "assignedTo" }],
    })
    ctx.body = companies
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getCompanyById = async (ctx: Context) => {
  try {
    const company = await Company.findByPk(ctx.params.id, {
      include: [{ model: Status }, { model: User, as: "assignedTo" }, { model: Contact }],
    })
    if (!company) {
      ctx.status = 404
      ctx.body = { error: "Company not found" }
      return
    }
    ctx.body = company
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
}

export const getCompaniesByTenant = async (ctx: Context) => {
  try {
    const companies = await Company.findAll({
      where: {
        tenantId: ctx.params.tenantId,
      },
      include: [{ model: Status }, { model: User, as: "assignedTo" }],
    })
    ctx.body = companies
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
