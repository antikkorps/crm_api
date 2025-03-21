import { Context } from "koa"
import { ExternalIntegration, UserIntegration } from "../models"
import { pluginRegistry } from "../plugins/registry"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { paginatedQuery } from "../utils/pagination"

/**
 * Liste toutes les intégrations disponibles pour un tenant
 */
export const getAllIntegrations = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(ExternalIntegration, ctx, {
      where: { tenantId: ctx.state.user.tenantId },
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère une intégration par son ID
 */
export const getIntegrationById = async (ctx: Context) => {
  try {
    const integration = await ExternalIntegration.findByPk(ctx.params.id)

    if (!integration) {
      throw new NotFoundError(`Integration with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès à cette intégration
    if (integration.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Integration with ID ${ctx.params.id} not found`)
    }

    ctx.body = integration
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Crée une nouvelle intégration
 */
export const createIntegration = async (ctx: Context) => {
  try {
    const { name, type, provider, configuration, apiKey, apiSecret, baseUrl } = ctx
      .request.body as any

    // Validation
    if (!name || !type || !provider) {
      throw new BadRequestError("Name, type, and provider are required")
    }

    // Créer l'intégration
    const integration = await ExternalIntegration.create({
      name,
      type,
      provider,
      configuration: configuration || {},
      apiKey,
      apiSecret,
      baseUrl,
      enabled: true,
      tenantId: ctx.state.user.tenantId,
    })

    ctx.status = 201
    ctx.body = integration
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Met à jour une intégration existante
 */
export const updateIntegration = async (ctx: Context) => {
  try {
    const integration = await ExternalIntegration.findByPk(ctx.params.id)

    if (!integration) {
      throw new NotFoundError(`Integration with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès à cette intégration
    if (integration.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Integration with ID ${ctx.params.id} not found`)
    }

    // Mettre à jour les champs
    const { name, configuration, apiKey, apiSecret, baseUrl, enabled } = ctx.request
      .body as any

    await integration.update({
      name: name !== undefined ? name : integration.get("name"),
      configuration:
        configuration !== undefined ? configuration : integration.get("configuration"),
      apiKey: apiKey !== undefined ? apiKey : integration.get("apiKey"),
      apiSecret: apiSecret !== undefined ? apiSecret : integration.get("apiSecret"),
      baseUrl: baseUrl !== undefined ? baseUrl : integration.get("baseUrl"),
      enabled: enabled !== undefined ? enabled : integration.get("enabled"),
    })

    ctx.body = integration
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Supprime une intégration
 */
export const deleteIntegration = async (ctx: Context) => {
  try {
    const integration = await ExternalIntegration.findByPk(ctx.params.id)

    if (!integration) {
      throw new NotFoundError(`Integration with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès à cette intégration
    if (integration.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Integration with ID ${ctx.params.id} not found`)
    }

    // Supprimer les associations utilisateur-intégration d'abord
    await UserIntegration.destroy({
      where: {
        integrationId: integration.get("id"),
      },
    })

    // Supprimer l'intégration
    await integration.destroy()

    ctx.status = 204
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Liste les plugins disponibles
 */
export const getAvailablePlugins = async (ctx: Context) => {
  try {
    const plugins = pluginRegistry.listPlugins()
    ctx.body = plugins
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Active un plugin pour un tenant
 */
export const activatePlugin = async (ctx: Context) => {
  try {
    const { pluginId, config } = ctx.request.body as any

    if (!pluginId) {
      throw new BadRequestError("Plugin ID is required")
    }

    // Vérifier si le plugin existe
    const plugin = pluginRegistry.getPlugin(pluginId)
    if (!plugin) {
      throw new NotFoundError(`Plugin ${pluginId} not found`)
    }

    // Initialiser le plugin avec le contexte du tenant
    const initialized = await pluginRegistry.initialize(
      pluginId,
      ctx.state.user.tenantId,
      config
    )
    if (!initialized) {
      throw new Error(`Failed to initialize plugin ${pluginId}`)
    }

    // Activer le plugin
    const activated = await pluginRegistry.activate(pluginId)
    if (!activated) {
      throw new Error(`Failed to activate plugin ${pluginId}`)
    }

    ctx.body = {
      message: `Plugin ${pluginId} activated successfully`,
      status: "active",
    }
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Désactive un plugin pour un tenant
 */
export const deactivatePlugin = async (ctx: Context) => {
  try {
    const { pluginId } = ctx.params

    if (!pluginId) {
      throw new BadRequestError("Plugin ID is required")
    }

    // Vérifier si le plugin existe
    const plugin = pluginRegistry.getPlugin(pluginId)
    if (!plugin) {
      throw new NotFoundError(`Plugin ${pluginId} not found`)
    }

    // Désactiver le plugin
    const deactivated = await pluginRegistry.deactivate(pluginId)
    if (!deactivated) {
      throw new Error(`Failed to deactivate plugin ${pluginId}`)
    }

    ctx.body = {
      message: `Plugin ${pluginId} deactivated successfully`,
      status: "inactive",
    }
  } catch (error: unknown) {
    throw error
  }
}
