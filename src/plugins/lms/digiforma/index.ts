import { PluginConfig } from "../../core/interfaces"
import { LmsPluginBase } from "../base"

/**
 * Configuration spécifique pour Digiforma
 */
interface DigiformaConfig extends PluginConfig {
  apiKey: string
  apiSecret: string
  baseUrl: string
}

/**
 * Plugin d'intégration pour Digiforma LMS
 */
export class DigiformaPlugin extends LmsPluginBase {
  protected config!: DigiformaConfig

  constructor() {
    super({
      id: "lms-digiforma",
      name: "Digiforma LMS Integration",
      version: "1.0.0",
      description: "Intégration avec la plateforme de formation Digiforma",
      author: "CRM API Team",
      website: "https://digiforma.com",
    })
  }

  /**
   * Initialisation du plugin
   */
  protected async onInitialize(): Promise<void> {
    if (!this.context) {
      throw new Error("Context is not initialized")
    }

    // Validation de la configuration
    if (!this.config.apiKey || !this.config.apiSecret || !this.config.baseUrl) {
      throw new Error(
        "Invalid Digiforma configuration: apiKey, apiSecret and baseUrl are required"
      )
    }

    // Enregistrement des hooks
    this.registerHook("contact.created", this.onContactCreated.bind(this), 10)
    this.registerHook("contact.updated", this.onContactUpdated.bind(this), 10)

    this.context.logger.info(
      `Digiforma plugin initialized for tenant: ${this.context.tenantId}`
    )
  }

  /**
   * Activation du plugin
   */
  protected async onActivate(): Promise<void> {
    try {
      // Tenter de s'authentifier immédiatement
      await this.authenticate()
      this.context?.logger.info("Digiforma plugin activated and authenticated")
    } catch (error) {
      this.context?.logger.error(
        `Failed to authenticate with Digiforma: ${(error as Error).message}`
      )
      throw error
    }
  }

  /**
   * Désactivation du plugin
   */
  protected async onDeactivate(): Promise<void> {
    this.authToken = null
    this.authenticated = false
    this.context?.logger.info("Digiforma plugin deactivated")
  }

  /**
   * Mise à jour de la configuration
   */
  protected async onConfigUpdate(config: PluginConfig): Promise<void> {
    this.config = config as DigiformaConfig

    // Réinitialiser l'authentification
    this.authToken = null
    this.authenticated = false

    if (this.config.apiKey && this.config.apiSecret && this.config.baseUrl) {
      await this.authenticate()
    }
  }

  /**
   * S'authentifie auprès de l'API Digiforma
   */
  public async authenticate(): Promise<boolean> {
    try {
      const response = await this.callLmsApi("post", "auth", {
        apiKey: this.config.apiKey,
        apiSecret: this.config.apiSecret,
      })

      this.authToken = response.token
      this.authenticated = true
      return true
    } catch (error) {
      this.context?.logger.error(`Authentication failed: ${(error as Error).message}`)
      this.authenticated = false
      return false
    }
  }

  /**
   * Récupère tous les cours depuis Digiforma
   */
  public async getCourses(): Promise<any[]> {
    const response = await this.callLmsApi("get", "courses")
    return response.courses || []
  }

  /**
   * Récupère un cours spécifique par son ID
   */
  public async getCourseById(courseId: string): Promise<any> {
    const response = await this.callLmsApi("get", `courses/${courseId}`)
    return response.course
  }

  /**
   * Récupère tous les utilisateurs de Digiforma
   */
  public async getUsers(): Promise<any[]> {
    const response = await this.callLmsApi("get", "users")
    return response.users || []
  }

  /**
   * Synchronise les utilisateurs entre le CRM et Digiforma
   */
  public async syncUsers(): Promise<any> {
    // Exemple de synchronisation
    if (!this.context) {
      throw new Error("Plugin not initialized")
    }

    const { User, UserIntegration } = this.context.services.models
    const tenantId = this.context.tenantId

    if (!tenantId) {
      throw new Error("Tenant ID is required for user synchronization")
    }

    // Récupérer les utilisateurs du CRM
    const crmUsers = await User.findAll({
      where: { tenantId },
    })

    // Récupérer les utilisateurs de Digiforma
    const lmsUsers = await this.getUsers()

    // Résultats de synchronisation
    const results = {
      created: 0,
      updated: 0,
      errors: 0,
      total: crmUsers.length,
    }

    // Pour chaque utilisateur du CRM, vérifier s'il existe dans Digiforma
    for (const crmUser of crmUsers) {
      try {
        // Vérifier si l'utilisateur a déjà une intégration
        const existingIntegration = await UserIntegration.findOne({
          where: {
            userId: crmUser.get("id"),
            integrationId: this.metadata.id,
          },
        })

        if (existingIntegration) {
          // Utilisateur déjà intégré, mettre à jour
          const lmsUser = lmsUsers.find(
            (u) => u.id === existingIntegration.get("externalUserId")
          )
          if (lmsUser) {
            // Mise à jour
            // ...
            results.updated++
          }
        } else {
          // Créer un nouvel utilisateur dans Digiforma
          const newLmsUser = await this.createUser({
            email: crmUser.get("email"),
            firstName: crmUser.get("firstName"),
            lastName: crmUser.get("lastName"),
          })

          // Enregistrer l'intégration
          await UserIntegration.create({
            userId: crmUser.get("id"),
            integrationId: this.metadata.id,
            externalUserId: newLmsUser.id,
            externalUserData: newLmsUser,
            lastSyncedAt: new Date(),
          })

          results.created++
        }
      } catch (error) {
        this.context.logger.error(
          `Error syncing user ${crmUser.get("id")}: ${(error as Error).message}`
        )
        results.errors++
      }
    }

    return results
  }

  /**
   * Crée un utilisateur dans Digiforma
   */
  public async createUser(userData: any): Promise<any> {
    const response = await this.callLmsApi("post", "users", userData)
    return response.user
  }

  /**
   * Inscrit un utilisateur à un cours
   */
  public async enrollUserInCourse(userId: string, courseId: string): Promise<boolean> {
    await this.callLmsApi("post", `courses/${courseId}/enroll`, {
      userId,
    })
    return true
  }

  /**
   * Récupère les inscriptions d'un utilisateur
   */
  public async getUserEnrollments(userId: string): Promise<any[]> {
    const response = await this.callLmsApi("get", `users/${userId}/enrollments`)
    return response.enrollments || []
  }

  /**
   * Récupère la progression d'un utilisateur dans un cours
   */
  public async getUserProgress(userId: string, courseId: string): Promise<any> {
    const response = await this.callLmsApi(
      "get",
      `users/${userId}/courses/${courseId}/progress`
    )
    return response.progress
  }

  /**
   * Récupère les certifications d'un utilisateur
   */
  public async getUserCertifications(userId: string): Promise<any[]> {
    const response = await this.callLmsApi("get", `users/${userId}/certifications`)
    return response.certifications || []
  }

  /**
   * Hook appelé lorsqu'un contact est créé
   */
  private async onContactCreated(contact: any): Promise<void> {
    // Exemple: Créer automatiquement un compte apprenant dans Digiforma pour les nouveaux contacts
    if (!contact.email) return

    try {
      const result = await this.createUser({
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
      })

      this.context?.logger.info(
        `Created Digiforma user for new contact ${contact.id}: ${result.id}`
      )
    } catch (error) {
      this.context?.logger.error(
        `Failed to create Digiforma user for contact ${contact.id}: ${
          (error as Error).message
        }`
      )
    }
  }

  /**
   * Hook appelé lorsqu'un contact est mis à jour
   */
  private async onContactUpdated(contact: any): Promise<void> {
    // Logique de synchronisation des mises à jour
    // ...
  }
}

// Exporter le plugin
export default new DigiformaPlugin()
