/**
 * Interfaces de base pour le système d'extensions
 */

/**
 * État de l'extension
 */
export enum PluginStatus {
  REGISTERED = "registered",
  ACTIVE = "active",
  INACTIVE = "inactive",
  ERROR = "error",
}

/**
 * Métadonnées de l'extension
 */
export interface PluginMetadata {
  id: string
  name: string
  version: string
  description: string
  author: string
  website?: string
  dependencies?: string[]
}

/**
 * Configuration de l'extension
 */
export interface PluginConfig {
  [key: string]: any
}

/**
 * Contexte d'initialisation de l'extension
 */
export interface PluginContext {
  tenantId?: string
  services: PluginServices
  events: PluginEventEmitter
  logger: PluginLogger
  config: PluginConfig
}

/**
 * Logger pour les extensions
 */
export interface PluginLogger {
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
  debug(message: string, ...args: any[]): void
}

/**
 * Émetteur d'événements pour les extensions
 */
export interface PluginEventEmitter {
  on(event: string, listener: (...args: any[]) => void): void
  off(event: string, listener: (...args: any[]) => void): void
  emit(event: string, ...args: any[]): boolean
}

/**
 * Services disponibles pour les extensions
 */
export interface PluginServices {
  database: any // Accès à la base de données
  models: any // Accès aux modèles
  api: ApiService // Service pour appels API externes
  auth: AuthService // Service d'authentification
  utils: UtilsService // Utilitaires
}

/**
 * Service pour les appels API externes
 */
export interface ApiService {
  get(url: string, options?: any): Promise<any>
  post(url: string, data: any, options?: any): Promise<any>
  put(url: string, data: any, options?: any): Promise<any>
  delete(url: string, options?: any): Promise<any>
}

/**
 * Service d'authentification
 */
export interface AuthService {
  getUserToken(userId: string, externalServiceId: string): Promise<string | null>
  storeUserToken(userId: string, externalServiceId: string, token: string): Promise<void>
}

/**
 * Utilitaires génériques pour les extensions
 */
export interface UtilsService {
  encrypt(data: string): string
  decrypt(encrypted: string): string
  generateId(): string
}

/**
 * Interface principale pour toutes les extensions
 */
export interface Plugin {
  metadata: PluginMetadata
  status: PluginStatus
  initialize(context: PluginContext): Promise<boolean>
  activate(): Promise<boolean>
  deactivate(): Promise<boolean>
  getConfig(): PluginConfig
  updateConfig(config: Partial<PluginConfig>): Promise<void>
}

/**
 * Hook pour étendre les fonctionnalités
 */
export interface PluginHook {
  name: string
  priority: number
  handler: (...args: any[]) => Promise<any>
}

/**
 * Types de points d'extension disponibles
 */
export enum ExtensionPoint {
  // Points d'extension pour les modèles
  CONTACT_CREATED = "contact.created",
  CONTACT_UPDATED = "contact.updated",
  COMPANY_CREATED = "company.created",
  COMPANY_UPDATED = "company.updated",

  // Points d'extension pour l'UI (à implémenter côté frontend)
  UI_CONTACT_DETAIL = "ui.contact.detail",
  UI_COMPANY_DETAIL = "ui.company.detail",
  UI_DASHBOARD = "ui.dashboard",

  // Points d'extension pour les intégrations externes
  EXTERNAL_AUTH = "external.auth",
  EXTERNAL_SYNC = "external.sync",

  // Points d'extension pour les workflows
  WORKFLOW_ACTION = "workflow.action",
  WORKFLOW_TRIGGER = "workflow.trigger",

  // Points d'extension pour les notifications
  NOTIFICATION_CHANNEL = "notification.channel",
}
