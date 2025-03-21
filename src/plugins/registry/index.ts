import { EventEmitter } from "events"
import { sequelize } from "../../config/database"
import { Plugin, PluginContext, PluginMetadata, PluginStatus } from "../core/interfaces"

// Logger simple pour les plugins
const pluginLogger = {
  info: (message: string, ...args: any[]) =>
    console.log(`[PLUGIN INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) =>
    console.warn(`[PLUGIN WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) =>
    console.error(`[PLUGIN ERROR] ${message}`, ...args),
  debug: (message: string, ...args: any[]) =>
    console.debug(`[PLUGIN DEBUG] ${message}`, ...args),
}

// Services de base disponibles pour les plugins
const pluginServices = {
  database: sequelize,
  models: require("../../models"),
  api: {
    get: async (url: string, options?: any) => {
      const response = await fetch(url, {
        method: "GET",
        ...options,
      })
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    },
    post: async (url: string, data: any, options?: any) => {
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
        ...options,
      })
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    },
    put: async (url: string, data: any, options?: any) => {
      const response = await fetch(url, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
        ...options,
      })
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    },
    delete: async (url: string, options?: any) => {
      const response = await fetch(url, {
        method: "DELETE",
        ...options,
      })
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    },
  },
  auth: {
    getUserToken: async (userId: string, externalServiceId: string) => {
      // Implémentation à définir pour récupérer des tokens stockés
      return null
    },
    storeUserToken: async (userId: string, externalServiceId: string, token: string) => {
      // Implémentation à définir pour stocker des tokens
    },
  },
  utils: {
    encrypt: (data: string) => {
      // Implémentation simple pour le chiffrement (à remplacer par une vraie implémentation)
      return Buffer.from(data).toString("base64")
    },
    decrypt: (encrypted: string) => {
      // Implémentation simple pour le déchiffrement (à remplacer par une vraie implémentation)
      return Buffer.from(encrypted, "base64").toString("utf8")
    },
    generateId: () => {
      return `plugin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    },
  },
}

/**
 * Gestionnaire de plugins
 */
class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map()
  private eventEmitter: EventEmitter = new EventEmitter()

  constructor() {
    this.eventEmitter.setMaxListeners(100) // Augmenter la limite d'écouteurs
  }

  /**
   * Enregistre un nouveau plugin
   */
  public async register(plugin: Plugin): Promise<boolean> {
    if (this.plugins.has(plugin.metadata.id)) {
      console.warn(`Plugin ${plugin.metadata.id} is already registered 🤯🤯🤯`)
      return false
    }

    this.plugins.set(plugin.metadata.id, plugin)
    console.log(`Plugin ${plugin.metadata.id} registered successfully 🔥🔥🔥`)

    return true
  }

  /**
   * Initialise un plugin
   */
  public async initialize(
    pluginId: string,
    tenantId?: string,
    config: any = {}
  ): Promise<boolean> {
    const plugin = this.plugins.get(pluginId)

    if (!plugin) {
      console.error(`Plugin ${pluginId} not found 😮😮😮`)
      return false
    }

    const context: PluginContext = {
      tenantId,
      services: pluginServices,
      events: {
        on: (event, listener) => this.eventEmitter.on(event, listener),
        off: (event, listener) => this.eventEmitter.off(event, listener),
        emit: (event, ...args) => this.eventEmitter.emit(event, ...args),
      },
      logger: pluginLogger,
      config,
    }

    return await plugin.initialize(context)
  }

  /**
   * Active un plugin
   */
  public async activate(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId)

    if (!plugin) {
      console.error(`Plugin ${pluginId} not found`)
      return false
    }

    return await plugin.activate()
  }

  /**
   * Désactive un plugin
   */
  public async deactivate(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId)

    if (!plugin) {
      console.error(`Plugin ${pluginId} not found`)
      return false
    }

    return await plugin.deactivate()
  }

  /**
   * Liste tous les plugins enregistrés
   */
  public listPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map((plugin) => ({
      ...plugin.metadata,
      status: plugin.status,
    })) as any[]
  }

  /**
   * Récupère un plugin par son ID
   */
  public getPlugin(pluginId: string): Plugin | null {
    return this.plugins.get(pluginId) || null
  }

  /**
   * Exécute les hooks pour un point d'extension donné
   */
  public async executeHooks(hookName: string, ...args: any[]): Promise<any[]> {
    const results: any[] = []

    for (const plugin of this.plugins.values()) {
      if (plugin.status === PluginStatus.ACTIVE) {
        // Exécuter le hook si disponible dans ce plugin
        // Cette partie nécessiterait une implémentation plus robuste
        try {
          // Simuler l'exécution du hook
          this.eventEmitter.emit(`hook:${hookName}`, ...args)
        } catch (error) {
          console.error(
            `Error executing hook ${hookName} in plugin ${plugin.metadata.id}:`,
            error
          )
        }
      }
    }

    return results
  }
}

// Exporter une instance singleton
export const pluginRegistry = new PluginRegistry()
