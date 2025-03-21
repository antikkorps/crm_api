import { PluginMetadata } from "../core/interfaces"
import { PluginBase } from "../core/plugin-base"

/**
 * Interface de base pour tous les plugins LMS
 */
export interface LmsPlugin {
  // Authentification
  authenticate(): Promise<boolean>
  isAuthenticated(): boolean

  // Méthodes pour les cours
  getCourses(): Promise<any[]>
  getCourseById(courseId: string): Promise<any>

  // Méthodes pour les utilisateurs
  getUsers(): Promise<any[]>
  syncUsers(): Promise<any>
  createUser(userData: any): Promise<any>

  // Méthodes pour les inscriptions
  enrollUserInCourse(userId: string, courseId: string): Promise<boolean>
  getUserEnrollments(userId: string): Promise<any[]>

  // Méthodes pour les progrès et certifications
  getUserProgress(userId: string, courseId: string): Promise<any>
  getUserCertifications(userId: string): Promise<any[]>
}

/**
 * Classe de base abstraite pour tous les plugins LMS
 */
export abstract class LmsPluginBase extends PluginBase implements LmsPlugin {
  protected authToken: string | null = null
  protected authenticated: boolean = false

  constructor(metadata: PluginMetadata) {
    super(metadata)
  }

  /**
   * Vérifie si le plugin est authentifié auprès du LMS
   */
  public isAuthenticated(): boolean {
    return this.authenticated
  }

  /**
   * Méthodes abstraites à implémenter par chaque plugin LMS spécifique
   */
  public abstract authenticate(): Promise<boolean>
  public abstract getCourses(): Promise<any[]>
  public abstract getCourseById(courseId: string): Promise<any>
  public abstract getUsers(): Promise<any[]>
  public abstract syncUsers(): Promise<any>
  public abstract createUser(userData: any): Promise<any>
  public abstract enrollUserInCourse(userId: string, courseId: string): Promise<boolean>
  public abstract getUserEnrollments(userId: string): Promise<any[]>
  public abstract getUserProgress(userId: string, courseId: string): Promise<any>
  public abstract getUserCertifications(userId: string): Promise<any[]>

  /**
   * Méthode utilitaire pour appeler l'API du LMS
   */
  protected async callLmsApi(
    method: "get" | "post" | "put" | "delete",
    endpoint: string,
    data?: any
  ): Promise<any> {
    if (!this.context) {
      throw new Error("Plugin not initialized")
    }

    if (!this.isAuthenticated() && endpoint !== "auth") {
      await this.authenticate()
    }

    const baseUrl = this.config.baseUrl || ""
    const url = `${baseUrl}${endpoint}`

    try {
      const headers = {
        Authorization: `Bearer ${this.authToken}`,
        "Content-Type": "application/json",
      }

      let response

      // Utiliser les méthodes fetch de notre service API
      switch (method) {
        case "get":
          response = await this.context.services.api.get(url, { headers })
          break
        case "post":
          response = await this.context.services.api.post(url, data, { headers })
          break
        case "put":
          response = await this.context.services.api.put(url, data, { headers })
          break
        case "delete":
          response = await this.context.services.api.delete(url, { headers })
          break
      }

      return response // Les méthodes api retournent déjà le JSON parsé
    } catch (error: any) {
      // Gérer l'authentification expirée (code 401)
      if (error.message && error.message.includes("401")) {
        this.authenticated = false
        this.authToken = null

        // Tenter une réauthentification une fois
        if (endpoint !== "auth") {
          await this.authenticate()
          return this.callLmsApi(method, endpoint, data)
        }
      }

      throw error
    }
  }
}
