import Router from "koa-router"
import { Tenant } from "../models"

const router = new Router({ prefix: "/api/tenants" })

// Récupérer tous les tenants
router.get("/", async (ctx) => {
  try {
    const tenants = await Tenant.findAll()
    ctx.body = tenants
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
})

// Récupérer un tenant par ID
router.get("/:id", async (ctx) => {
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
})

// Créer un nouveau tenant
router.post("/", async (ctx) => {
  try {
    const tenant = await Tenant.create((ctx.request as any).body)
    ctx.status = 201
    ctx.body = tenant
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
})

// Mettre à jour un tenant
router.put("/:id", async (ctx) => {
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
})

// Supprimer un tenant
router.delete("/:id", async (ctx) => {
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
})

// Export the router as default export
export default router
