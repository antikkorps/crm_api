import {
  Activity,
  Company,
  Contact,
  ContactSegment,
  Reminder,
  Segment,
  User,
  Workflow,
  WorkflowAction as WorkflowActionModel,
  WorkflowExecution,
  WorkflowTrigger,
} from "../models"
import { ActionType } from "../models/workflowAction"
import { ExecutionStatus } from "../models/workflowExecution"
import { TriggerType } from "../models/workflowTrigger"
import { EventContext, EventType, eventEmitter } from "../utils/eventEmitter"

// Interface pour les résultats des actions
interface ActionResult {
  [key: string]: any
}

// Interface pour le contexte enrichi d'exécution du workflow
interface WorkflowContext extends EventContext {
  results?: {
    [actionId: string]: ActionResult
  }
  isManualExecution?: boolean
  workflowId?: string
}

// Interface pour les journaux d'exécution
interface ExecutionLogEntry {
  step: number
  actionId: string
  actionType: string
  status: "SUCCESS" | "FAILED" | "SKIPPED"
  message?: string
  result?: any
  error?: string
  timestamp: Date
}

/**
 * Classe principale du moteur de workflow
 */
export class WorkflowEngine {
  private static instance: WorkflowEngine

  private constructor() {
    this.registerEventListeners()
  }

  public static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine()
    }
    return WorkflowEngine.instance
  }

  /**
   * Initialise le moteur de workflow et enregistre les écouteurs d'événements
   */
  private registerEventListeners(): void {
    // Écouter les événements de contact
    eventEmitter.on(EventType.CONTACT_CREATED, this.handleContactCreated.bind(this))
    eventEmitter.on(EventType.CONTACT_UPDATED, this.handleContactUpdated.bind(this))
    eventEmitter.on(
      EventType.CONTACT_STATUS_CHANGED,
      this.handleContactStatusChanged.bind(this)
    )

    // Écouter les événements d'entreprise
    eventEmitter.on(EventType.COMPANY_CREATED, this.handleCompanyCreated.bind(this))
    eventEmitter.on(EventType.COMPANY_UPDATED, this.handleCompanyUpdated.bind(this))
    eventEmitter.on(
      EventType.COMPANY_STATUS_CHANGED,
      this.handleCompanyStatusChanged.bind(this)
    )

    // Écouter les événements d'activité
    eventEmitter.on(EventType.ACTIVITY_CREATED, this.handleActivityCreated.bind(this))
    eventEmitter.on(EventType.ACTIVITY_COMPLETED, this.handleActivityCompleted.bind(this))

    // Écouter les événements de rappel
    eventEmitter.on(EventType.REMINDER_DUE, this.handleReminderDue.bind(this))

    // Écouter les événements de segment
    eventEmitter.on(
      EventType.CONTACT_ADDED_TO_SEGMENT,
      this.handleSegmentMembershipChanged.bind(this)
    )
    eventEmitter.on(
      EventType.CONTACT_REMOVED_FROM_SEGMENT,
      this.handleSegmentMembershipChanged.bind(this)
    )
  }

  /**
   * Gère les événements de création de contact
   */
  private async handleContactCreated(context: EventContext): Promise<void> {
    await this.processEvent(TriggerType.CONTACT_CREATED, context)
  }

  /**
   * Gère les événements de mise à jour de contact
   */
  private async handleContactUpdated(context: EventContext): Promise<void> {
    await this.processEvent(TriggerType.CONTACT_UPDATED, context)
  }

  /**
   * Gère les événements de changement de statut d'un contact
   */
  private async handleContactStatusChanged(context: EventContext): Promise<void> {
    await this.processEvent(TriggerType.CONTACT_STATUS_CHANGED, context)
  }

  /**
   * Gère les événements de création d'entreprise
   */
  private async handleCompanyCreated(context: EventContext): Promise<void> {
    await this.processEvent(TriggerType.COMPANY_CREATED, context)
  }

  /**
   * Gère les événements de mise à jour d'entreprise
   */
  private async handleCompanyUpdated(context: EventContext): Promise<void> {
    await this.processEvent(TriggerType.COMPANY_UPDATED, context)
  }

  /**
   * Gère les événements de changement de statut d'une entreprise
   */
  private async handleCompanyStatusChanged(context: EventContext): Promise<void> {
    await this.processEvent(TriggerType.COMPANY_STATUS_CHANGED, context)
  }

  /**
   * Gère les événements de création d'activité
   */
  private async handleActivityCreated(context: EventContext): Promise<void> {
    await this.processEvent(TriggerType.ACTIVITY_CREATED, context)
  }

  /**
   * Gère les événements d'accomplissement d'activité
   */
  private async handleActivityCompleted(context: EventContext): Promise<void> {
    await this.processEvent(TriggerType.ACTIVITY_COMPLETED, context)
  }

  /**
   * Gère les événements de rappels arrivant à échéance
   */
  private async handleReminderDue(context: EventContext): Promise<void> {
    await this.processEvent(TriggerType.REMINDER_DUE, context)
  }

  /**
   * Gère les événements de changement d'appartenance à un segment
   */
  private async handleSegmentMembershipChanged(context: EventContext): Promise<void> {
    await this.processEvent(TriggerType.SEGMENT_MEMBERSHIP_CHANGED, context)
  }

  /**
   * Traite un événement et déclenche les workflows appropriés
   */
  private async processEvent(
    triggerType: TriggerType,
    context: EventContext
  ): Promise<void> {
    try {
      const { tenantId, entityId, entityType } = context

      // Trouver tous les triggers qui correspondent à cet événement pour ce tenant
      const triggers = await WorkflowTrigger.findAll({
        include: [
          {
            model: Workflow,
            where: {
              tenantId: tenantId,
              isActive: true,
            },
            required: true,
          },
        ],
        where: {
          triggerType: triggerType,
        },
      })

      // Pour chaque déclencheur, vérifier les conditions
      for (const trigger of triggers) {
        if (await this.checkTriggerConditions(trigger, context)) {
          const workflowId = trigger.get("workflowId") as string
          const triggerId = trigger.get("id") as string

          // Créer une instance d'exécution de workflow
          const execution = await WorkflowExecution.create({
            workflowId,
            triggerId,
            entityType,
            entityId,
            status: ExecutionStatus.PENDING,
            context: context as any,
            tenantId,
          })

          // Exécuter le workflow de façon asynchrone
          this.executeWorkflow(execution.get("id") as string).catch((error) =>
            console.error(`Error executing workflow: ${error.message}`)
          )
        }
      }
    } catch (error) {
      console.error(`Error processing event ${triggerType}:`, error)
    }
  }

  /**
   * Vérifie si les conditions du trigger sont remplies par le contexte
   */
  private async checkTriggerConditions(
    trigger: any,
    context: EventContext
  ): Promise<boolean> {
    const conditions = trigger.get("conditions")

    // Si pas de conditions, le trigger est valide
    if (!conditions) return true

    // Cas d'un changement de statut
    if (trigger.get("triggerType") === TriggerType.CONTACT_STATUS_CHANGED) {
      if (conditions.statusId && conditions.statusId !== context.data.statusId) {
        return false
      }
    }

    // Cas d'une création de contact avec des attributs spécifiques
    else if (trigger.get("triggerType") === TriggerType.CONTACT_CREATED) {
      // Vérifier chaque attribut dans les conditions
      for (const [key, value] of Object.entries(conditions)) {
        if (context.data[key] !== value) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Exécute le workflow avec l'ID d'exécution donné
   */
  public async executeWorkflow(executionId: string): Promise<void> {
    try {
      // Récupérer l'exécution
      const execution = await WorkflowExecution.findByPk(executionId, {
        include: [
          {
            model: Workflow,
            include: [
              {
                model: WorkflowActionModel,
                order: [["order", "ASC"]],
              },
            ],
          },
        ],
      })

      if (!execution) {
        throw new Error(`Execution ${executionId} not found`)
      }

      // Mettre à jour le statut de l'exécution
      await execution.update({
        status: ExecutionStatus.RUNNING,
        startedAt: new Date(),
        log: [],
      })

      const workflow = execution.get("Workflow") as any
      if (!workflow) {
        throw new Error(`Workflow not found for execution ${executionId}`)
      }

      const actions = workflow.WorkflowActions as any[]
      if (!actions || !Array.isArray(actions)) {
        throw new Error(`No actions found for workflow ${workflow.id}`)
      }

      const context = execution.get("context") as WorkflowContext

      // Exécuter les actions dans l'ordre
      for (const action of actions.sort((a, b) => a.order - b.order)) {
        try {
          // Vérifier les conditions d'exécution de l'action
          if (
            action.executeCondition &&
            !this.evaluateCondition(action.executeCondition, context)
          ) {
            await this.logExecutionStep(execution, {
              step: action.order,
              actionId: action.id,
              actionType: action.actionType,
              status: "SKIPPED",
              message: "Condition not met",
              timestamp: new Date(),
            })
            continue
          }

          // Exécuter l'action
          const result = await this.executeAction(action, context)

          // Mettre à jour le contexte avec le résultat
          context.results = context.results || {}
          context.results[action.id] = result

          // Journaliser le succès
          await this.logExecutionStep(execution, {
            step: action.order,
            actionId: action.id,
            actionType: action.actionType,
            status: "SUCCESS",
            result: result,
            timestamp: new Date(),
          })
        } catch (error: any) {
          // Journaliser l'échec
          await this.logExecutionStep(execution, {
            step: action.order,
            actionId: action.id,
            actionType: action.actionType,
            status: "FAILED",
            error: error.message,
            timestamp: new Date(),
          })

          // Si une action échoue, marquer l'exécution comme échouée et arrêter
          await execution.update({
            status: ExecutionStatus.FAILED,
            completedAt: new Date(),
          })

          throw error
        }
      }

      // Toutes les actions ont réussi, marquer l'exécution comme terminée
      await execution.update({
        status: ExecutionStatus.COMPLETED,
        completedAt: new Date(),
      })
    } catch (error: any) {
      console.error(`Error executing workflow ${executionId}:`, error)

      // S'assurer que l'exécution est marquée comme échouée
      await WorkflowExecution.update(
        {
          status: ExecutionStatus.FAILED,
          completedAt: new Date(),
        },
        { where: { id: executionId } }
      )
    }
  }

  /**
   * Évalue une condition pour déterminer si une action doit être exécutée
   */
  private evaluateCondition(condition: any, context: WorkflowContext): boolean {
    try {
      const { field, operator, value } = condition
      const fieldPath = field.split(".")
      let actualValue: any = context

      // Récupérer la valeur du champ dans le contexte (peut être imbriqué)
      for (const path of fieldPath) {
        actualValue = actualValue[path]
        if (actualValue === undefined || actualValue === null) {
          return false
        }
      }

      // Comparer selon l'opérateur
      switch (operator) {
        case "equals":
          return actualValue === value
        case "notEquals":
          return actualValue !== value
        case "contains":
          return String(actualValue).includes(String(value))
        case "greaterThan":
          return actualValue > value
        case "lessThan":
          return actualValue < value
        default:
          return false
      }
    } catch (error) {
      console.error("Error evaluating condition:", error)
      return false
    }
  }

  /**
   * Exécute une action de workflow spécifique
   */
  private async executeAction(
    action: any,
    context: WorkflowContext
  ): Promise<ActionResult> {
    const actionType: ActionType = action.actionType
    const params: any = action.params

    switch (actionType) {
      case ActionType.UPDATE_CONTACT:
        return this.executeUpdateContactAction(params, context)

      case ActionType.UPDATE_COMPANY:
        return this.executeUpdateCompanyAction(params, context)

      case ActionType.CREATE_ACTIVITY:
        return this.executeCreateActivityAction(params, context)

      case ActionType.CREATE_REMINDER:
        return this.executeCreateReminderAction(params, context)

      case ActionType.SEND_EMAIL:
        return this.executeSendEmailAction(params, context)

      case ActionType.ADD_TO_SEGMENT:
        return this.executeAddToSegmentAction(params, context)

      case ActionType.REMOVE_FROM_SEGMENT:
        return this.executeRemoveFromSegmentAction(params, context)

      case ActionType.ASSIGN_TO_USER:
        return this.executeAssignToUserAction(params, context)

      case ActionType.WEBHOOK:
        return this.executeWebhookAction(params, context)

      case ActionType.DELAY:
        return this.executeDelayAction(params, context)

      default:
        throw new Error(`Unsupported action type: ${actionType}`)
    }
  }

  /**
   * Met à jour un contact
   */
  private async executeUpdateContactAction(
    params: any,
    context: WorkflowContext
  ): Promise<ActionResult> {
    const contactId = params.contactId || context.entityId

    if (!contactId) {
      throw new Error("No contact ID provided for update")
    }

    const contact = await Contact.findByPk(contactId)
    if (!contact) {
      throw new Error(`Contact with ID ${contactId} not found`)
    }

    // Filtrer les champs autorisés pour la mise à jour
    const allowedFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "statusId",
      "assignedToId",
    ]

    const updateData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (params[field] !== undefined) {
        updateData[field] = params[field]
      }
    }

    await contact.update(updateData)
    return { contactId, updated: updateData }
  }

  /**
   * Met à jour une entreprise
   */
  private async executeUpdateCompanyAction(
    params: any,
    context: WorkflowContext
  ): Promise<ActionResult> {
    const companyId = params.companyId || context.entityId

    if (!companyId) {
      throw new Error("No company ID provided for update")
    }

    const company = await Company.findByPk(companyId)
    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`)
    }

    // Filtrer les champs autorisés pour la mise à jour
    const allowedFields = [
      "name",
      "website",
      "industry",
      "statusId",
      "assignedToId",
      "address",
      "city",
      "country",
    ]

    const updateData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (params[field] !== undefined) {
        updateData[field] = params[field]
      }
    }

    await company.update(updateData)
    return { companyId, updated: updateData }
  }

  /**
   * Crée une nouvelle activité
   */
  private async executeCreateActivityAction(
    params: any,
    context: WorkflowContext
  ): Promise<ActionResult> {
    // Valider les paramètres
    if (!params.type) {
      throw new Error("Activity type is required")
    }

    const activityData: Record<string, any> = {
      type: params.type,
      title: params.title,
      content: params.content,
      tenantId: context.tenantId,
      createdById: params.createdById || context.userId || null,
      contactId:
        params.contactId || (context.entityType === "contact" ? context.entityId : null),
      companyId:
        params.companyId || (context.entityType === "company" ? context.entityId : null),
      assignedToId: params.assignedToId,
    }

    // Ajouter des champs spécifiques au type d'activité
    switch (params.type) {
      case "CALL":
        if (params.callDirection) activityData.callDirection = params.callDirection
        if (params.duration) activityData.duration = params.duration
        if (params.callOutcome) activityData.callOutcome = params.callOutcome
        break

      case "MEETING":
        if (params.startTime) activityData.startTime = params.startTime
        if (params.endTime) activityData.endTime = params.endTime
        if (params.location) activityData.location = params.location
        if (params.attendees) activityData.attendees = params.attendees
        break

      case "TASK":
        if (params.dueDate) activityData.dueDate = params.dueDate
        if (params.priority) activityData.priority = params.priority
        if (params.taskStatus) activityData.taskStatus = params.taskStatus
        break

      case "EMAIL":
        if (params.emailSubject) activityData.emailSubject = params.emailSubject
        if (params.emailStatus) activityData.emailStatus = params.emailStatus
        break
    }

    const activity = await Activity.create(activityData)
    return { activityId: activity.get("id"), type: params.type }
  }

  /**
   * Crée un nouveau rappel
   */
  private async executeCreateReminderAction(
    params: any,
    context: WorkflowContext
  ): Promise<ActionResult> {
    // Valider les paramètres
    if (!params.title || !params.dueDate) {
      throw new Error("Reminder title and dueDate are required")
    }

    const reminderData = {
      title: params.title,
      description: params.description,
      dueDate: params.dueDate,
      priority: params.priority || "MEDIUM",
      isCompleted: false,
      tenantId: context.tenantId,
      createdById: params.createdById || context.userId,
      assignedToId: params.assignedToId || context.userId,
      contactId:
        params.contactId || (context.entityType === "contact" ? context.entityId : null),
      companyId:
        params.companyId || (context.entityType === "company" ? context.entityId : null),
    }

    const reminder = await Reminder.create(reminderData)
    return {
      reminderId: reminder.get("id"),
      title: params.title,
      dueDate: params.dueDate,
    }
  }

  /**
   * Envoie un email (intégration à implémenter avec un service d'email)
   */
  private async executeSendEmailAction(
    params: any,
    context: WorkflowContext
  ): Promise<ActionResult> {
    // Cette méthode nécessite une intégration avec un service d'email
    // Ici c'est une implémentation simulée
    console.log("MOCK: Send email -", {
      to: params.to,
      subject: params.subject,
      body: params.body,
      context: {
        tenantId: context.tenantId,
        entityType: context.entityType,
        entityId: context.entityId,
      },
    })

    // Créer une activité de type Email pour tracer l'envoi
    if (params.trackAsActivity) {
      await Activity.create({
        type: "EMAIL",
        title: `Email: ${params.subject}`,
        content: params.body,
        emailSubject: params.subject,
        emailStatus: "SENT",
        emailRecipients: Array.isArray(params.to) ? params.to : [params.to],
        tenantId: context.tenantId,
        createdById: context.userId,
        contactId: context.entityType === "contact" ? context.entityId : null,
        companyId: context.entityType === "company" ? context.entityId : null,
      })
    }

    return {
      sent: true,
      to: params.to,
      subject: params.subject,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Ajoute un contact à un segment
   */
  private async executeAddToSegmentAction(
    params: any,
    context: WorkflowContext
  ): Promise<ActionResult> {
    if (!params.segmentId) {
      throw new Error("Segment ID is required")
    }

    const contactId =
      params.contactId || (context.entityType === "contact" ? context.entityId : null)

    if (!contactId) {
      throw new Error("No contact ID found in params or context")
    }

    const segment = await Segment.findByPk(params.segmentId)
    if (!segment) {
      throw new Error(`Segment with ID ${params.segmentId} not found`)
    }

    // Vérifier si l'association existe déjà
    const existingAssociation = await ContactSegment.findOne({
      where: {
        contactId: contactId,
        segmentId: params.segmentId,
      },
    })

    if (existingAssociation) {
      // Si elle existe mais n'est pas marquée comme manuelle, mettre à jour
      if (!existingAssociation.get("isManuallyAdded")) {
        await existingAssociation.update({
          isManuallyAdded: true,
        })
      }
    } else {
      // Créer une nouvelle association
      await ContactSegment.create({
        contactId: contactId,
        segmentId: params.segmentId,
        isManuallyAdded: true,
        addedAt: new Date(),
      })

      // Incrémenter le compteur de contacts du segment
      await segment.increment("contactCount")
    }

    return {
      segmentId: params.segmentId,
      contactId: contactId,
      action: "added",
    }
  }

  /**
   * Retire un contact d'un segment
   */
  private async executeRemoveFromSegmentAction(
    params: any,
    context: WorkflowContext
  ): Promise<ActionResult> {
    if (!params.segmentId) {
      throw new Error("Segment ID is required")
    }

    const contactId =
      params.contactId || (context.entityType === "contact" ? context.entityId : null)

    if (!contactId) {
      throw new Error("No contact ID found in params or context")
    }

    // Vérifier si le segment existe
    const segment = await Segment.findByPk(params.segmentId)
    if (!segment) {
      throw new Error(`Segment with ID ${params.segmentId} not found`)
    }

    // Vérifier si l'association existe
    const association = await ContactSegment.findOne({
      where: {
        contactId: contactId,
        segmentId: params.segmentId,
      },
    })

    if (!association) {
      return {
        segmentId: params.segmentId,
        contactId: contactId,
        action: "not_in_segment",
      }
    }

    // Supprimer l'association
    await association.destroy()

    // Décrémenter le compteur de contacts du segment
    const currentCount = segment.get("contactCount") as number
    if (currentCount > 0) {
      await segment.update({
        contactCount: currentCount - 1,
      })
    }

    return {
      segmentId: params.segmentId,
      contactId: contactId,
      action: "removed",
    }
  }

  /**
   * Assigne un utilisateur à un contact ou une entreprise
   */
  private async executeAssignToUserAction(
    params: any,
    context: WorkflowContext
  ): Promise<ActionResult> {
    if (!params.userId) {
      throw new Error("User ID is required")
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(params.userId)
    if (!user) {
      throw new Error(`User with ID ${params.userId} not found`)
    }

    // Déterminer le type d'entité à mettre à jour
    const entityType = params.entityType || context.entityType
    const entityId = params.entityId || context.entityId

    if (!entityType || !entityId) {
      throw new Error("Entity type and ID are required")
    }

    // Mettre à jour l'entité
    if (entityType === "contact") {
      const contact = await Contact.findByPk(entityId)
      if (!contact) {
        throw new Error(`Contact with ID ${entityId} not found`)
      }

      await contact.update({
        assignedToId: params.userId,
      })

      return {
        entityType,
        entityId,
        userId: params.userId,
        action: "assigned",
      }
    } else if (entityType === "company") {
      const company = await Company.findByPk(entityId)
      if (!company) {
        throw new Error(`Company with ID ${entityId} not found`)
      }

      await company.update({
        assignedToId: params.userId,
      })

      return {
        entityType,
        entityId,
        userId: params.userId,
        action: "assigned",
      }
    } else {
      throw new Error(`Unsupported entity type: ${entityType}`)
    }
  }

  /**
   * Exécute une requête webhook vers un service externe
   */
  private async executeWebhookAction(
    params: any,
    context: WorkflowContext
  ): Promise<ActionResult> {
    if (!params.url) {
      throw new Error("Webhook URL is required")
    }

    // Construire le payload
    const payload = {
      event: params.event || "workflow_action",
      timestamp: new Date().toISOString(),
      context: {
        tenantId: context.tenantId,
        entityType: context.entityType,
        entityId: context.entityId,
        workflowId: context.workflowId,
      },
      data: params.data || {},
    }

    try {
      // Note: Dans un environnement de production, utilisez une bibliothèque
      // comme axios ou node-fetch pour les requêtes HTTP
      console.log(`MOCK: Webhook call to ${params.url}`, payload)

      // Simuler une réponse réussie
      return {
        url: params.url,
        status: "success",
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Webhook execution failed: ${errorMessage}`)
    }
  }

  /**
   * Ajoute un délai dans l'exécution du workflow
   */
  private async executeDelayAction(
    params: any,
    context: WorkflowContext
  ): Promise<ActionResult> {
    const delayInMs = params.delayInMinutes ? params.delayInMinutes * 60 * 1000 : 0

    if (delayInMs > 0) {
      // Simuler un délai avec une promesse
      await new Promise((resolve) => setTimeout(resolve, delayInMs))
    }

    return {
      delayInMinutes: params.delayInMinutes || 0,
      completed: true,
    }
  }

  /**
   * Journalise une étape de l'exécution
   */
  private async logExecutionStep(
    execution: any,
    logEntry: ExecutionLogEntry
  ): Promise<void> {
    try {
      // Récupérer le journal existant
      const currentLog = execution.get("log") || []

      // Ajouter la nouvelle entrée
      const updatedLog = [...currentLog, logEntry]

      // Mettre à jour l'exécution
      await execution.update({
        log: updatedLog,
      })
    } catch (error) {
      console.error("Error updating execution log:", error)
    }
  }
}

// Initialiser et exporter l'instance du moteur
export const workflowEngine = WorkflowEngine.getInstance()

// Fonction pour démarrer le moteur
export function initializeWorkflowEngine(): void {
  console.log("Initializing workflow engine...")
  // L'instance est déjà créée lors de l'importation
}
