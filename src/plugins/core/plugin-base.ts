import {
  Plugin,
  PluginConfig,
  PluginContext,
  PluginHook,
  PluginMetadata,
  PluginStatus,
} from "./interfaces"

/**
 * Classe de base pour tous les plugins
 */
export abstract class PluginBase implements Plugin {
  public metadata: PluginMetadata
  public status: PluginStatus = PluginStatus.REGISTERED

  protected context: PluginContext | null = null
  protected config: PluginConfig = {}
  protected hooks: Map<string, PluginHook[]> = new Map()

  constructor(metadata: PluginMetadata) {
    this.metadata = metadata
  }

  /**
   * Initialise le plugin avec le contexte fourni
   */
  public async initialize(context: PluginContext): Promise<boolean> {
    this.context = context
    this.config = context.config

    try {
      await this.onInitialize()
      return true
    } catch (error) {
      this.status = PluginStatus.ERROR
      context.logger.error(
        `Failed to initialize plugin ${this.metadata.id}: ${(error as Error).message}`
      )
      return false
    }
  }

  /**
   * Active le plugin
   */
  public async activate(): Promise<boolean> {
    if (!this.context) {
      throw new Error(`Plugin ${this.metadata.id} not initialized`)
    }

    try {
      await this.onActivate()
      this.status = PluginStatus.ACTIVE
      return true
    } catch (error) {
      this.status = PluginStatus.ERROR
      this.context.logger.error(
        `Failed to activate plugin ${this.metadata.id}: ${(error as Error).message}`
      )
      return false
    }
  }

  /**
   * Désactive le plugin
   */
  public async deactivate(): Promise<boolean> {
    if (!this.context) {
      throw new Error(`Plugin ${this.metadata.id} not initialized`)
    }

    try {
      await this.onDeactivate()
      this.status = PluginStatus.INACTIVE
      return true
    } catch (error) {
      this.status = PluginStatus.ERROR
      this.context.logger.error(
        `Failed to deactivate plugin ${this.metadata.id}: ${(error as Error).message}`
      )
      return false
    }
  }

  /**
   * Récupère la configuration actuelle
   */
  public getConfig(): PluginConfig {
    return this.config
  }

  /**
   * Met à jour la configuration
   */
  public async updateConfig(config: Partial<PluginConfig>): Promise<void> {
    this.config = { ...this.config, ...config }

    if (this.context) {
      await this.onConfigUpdate(this.config)
    }
  }

  /**
   * Enregistre un hook pour un point d'extension
   */
  protected registerHook(
    hookName: string,
    handler: (...args: any[]) => Promise<any>,
    priority: number = 10
  ): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, [])
    }

    const hooks = this.hooks.get(hookName)!
    hooks.push({ name: hookName, priority, handler })

    // Trier par priorité (priorité la plus élevée d'abord)
    hooks.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Méthode appelée lors de l'initialisation
   */
  protected abstract onInitialize(): Promise<void>

  /**
   * Méthode appelée lors de l'activation
   */
  protected abstract onActivate(): Promise<void>

  /**
   * Méthode appelée lors de la désactivation
   */
  protected abstract onDeactivate(): Promise<void>

  /**
   * Méthode appelée lors de la mise à jour de la configuration
   */
  protected abstract onConfigUpdate(config: PluginConfig): Promise<void>
}
