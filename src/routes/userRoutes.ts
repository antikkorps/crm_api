import Router from "koa-router"
import { Role, User } from "../models"

const router = new Router({ prefix: "/api/users" })

// Récupérer tous les utilisateurs
router.get("/", async (ctx) => {
  try {
    const users = await User.findAll({
      include: Role,
    })
    ctx.body = users
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
})

// Récupérer un utilisateur par ID
router.get("/:id", async (ctx) => {
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
})

// Récupérer les utilisateurs par tenant
router.get("/tenant/:tenantId", async (ctx) => {
  try {
    const users = await User.findAll({
      where: {
        tenantId: ctx.params.tenantId,
      },
      include: Role,
    })
    ctx.body = users
  } catch (error: unknown) {
    ctx.status = 500
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
})

// Créer un nouvel utilisateur
router.post("/", async (ctx) => {
  try {
    const user = await User.create((ctx.request as any).body)
    ctx.status = 201
    ctx.body = user
  } catch (error: unknown) {
    ctx.status = 400
    ctx.body = { error: error instanceof Error ? error.message : String(error) }
  }
})

// Mettre à jour un utilisateur
router.put("/:id", async (ctx) => {
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
})

// Supprimer un utilisateur
router.delete("/:id", async (ctx) => {
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
})

// Export the router as default export
export default router
