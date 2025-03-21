import Router from "koa-router"
import activityRoutes from "../activityRoutes"
import analyticsRoutes from "../analyticsRoutes"
import companyRoutes from "../companyRoutes"
import contactRoutes from "../contactRoutes"
import noteRoutes from "../noteRoutes"
import reminderRoutes from "../reminderRoutes"
import roleRoutes from "../roleRoutes"
import segmentRoutes from "../segmentRoutes"
import statusRoutes from "../statusRoutes"
import tenantRoutes from "../tenantRoutes"
import userRoutes from "../userRoutes"
import workflowRoutes from "../workflowRoutes"

/**
 * Routeur pour l'API v1
 * Regroupe toutes les routes de la version 1 de l'API
 */
const v1Router = new Router()

// Configuration des routes sans leur préfixe d'origine (car géré par le routeur parent)
// On remplace les préfixes /api/ par / pour éviter la duplication
const configureV1Routes = (router: Router): void => {
  // Enlever le préfixe /api/ des routes d'origine
  v1Router.use(removeApiPrefix(router).routes())
}

// Fonction utilitaire pour retirer le préfixe /api/ d'un routeur
function removeApiPrefix(originalRouter: Router): Router {
  const newRouter = new Router()

  // Récupérer les routes du routeur original
  const originalRoutes = (originalRouter as any).stack || []

  // Parcourir toutes les routes et les recréer sans le préfixe /api/
  originalRoutes.forEach((layer: any) => {
    const { path, methods, stack } = layer

    // Remplacer le préfixe /api/ par /
    const newPath = path.replace(/^\/api/, "")

    // Recréer la route avec le nouveau chemin
    methods.forEach((method: string) => {
      method = method.toLowerCase()
      // Fix for TypeScript error: using type assertion and checking if method exists
      if (method !== "head" && typeof (newRouter as any)[method] === "function") {
        ;((newRouter as any)[method] as Function)(newPath, ...stack)
      }
    })
  })

  return newRouter
}

// Configuration de toutes les routes v1
configureV1Routes(tenantRoutes)
configureV1Routes(userRoutes)
configureV1Routes(contactRoutes)
configureV1Routes(companyRoutes)
configureV1Routes(roleRoutes)
configureV1Routes(statusRoutes)
configureV1Routes(noteRoutes)
configureV1Routes(activityRoutes)
configureV1Routes(segmentRoutes)
configureV1Routes(reminderRoutes)
configureV1Routes(analyticsRoutes)
configureV1Routes(workflowRoutes)

export default v1Router
