import { EventEmitter } from "events"

// Singleton pour gérer les événements à travers l'application
class AppEventEmitter extends EventEmitter {
  private static instance: AppEventEmitter

  private constructor() {
    super()
    // Configuration de l'émetteur d'événements
    // Augmenter la limite d'écouteurs pour éviter les avertissements
    this.setMaxListeners(50)
  }

  public static getInstance(): AppEventEmitter {
    if (!AppEventEmitter.instance) {
      AppEventEmitter.instance = new AppEventEmitter()
    }
    return AppEventEmitter.instance
  }
}

export const eventEmitter = AppEventEmitter.getInstance()

// Types d'événements pris en charge
export enum EventType {
  // Événements liés aux contacts
  CONTACT_CREATED = "contact.created",
  CONTACT_UPDATED = "contact.updated",
  CONTACT_STATUS_CHANGED = "contact.status_changed",
  CONTACT_DELETED = "contact.deleted",

  // Événements liés aux entreprises
  COMPANY_CREATED = "company.created",
  COMPANY_UPDATED = "company.updated",
  COMPANY_STATUS_CHANGED = "company.status_changed",
  COMPANY_DELETED = "company.deleted",

  // Événements liés aux activités
  ACTIVITY_CREATED = "activity.created",
  ACTIVITY_UPDATED = "activity.updated",
  ACTIVITY_COMPLETED = "activity.completed",
  ACTIVITY_DELETED = "activity.deleted",

  // Événements liés aux rappels
  REMINDER_CREATED = "reminder.created",
  REMINDER_UPDATED = "reminder.updated",
  REMINDER_COMPLETED = "reminder.completed",
  REMINDER_DUE = "reminder.due",
  REMINDER_DELETED = "reminder.deleted",

  // Événements liés aux segments
  SEGMENT_CREATED = "segment.created",
  SEGMENT_UPDATED = "segment.updated",
  SEGMENT_DELETED = "segment.deleted",
  CONTACT_ADDED_TO_SEGMENT = "segment.contact_added",
  CONTACT_REMOVED_FROM_SEGMENT = "segment.contact_removed",
}

// Type pour le contexte d'un événement
export interface EventContext<T = any> {
  tenantId: string
  entityId: string
  entityType: string
  userId?: string
  timestamp: Date
  data: T
  previousData?: T
}

// Fonction helper pour émettre des événements avec un contexte standardisé
export function emitEvent<T = any>(eventType: EventType, context: EventContext<T>): void {
  eventEmitter.emit(eventType, context)
  // Émettre également un événement catch-all pour les outils de monitoring
  eventEmitter.emit("*", { eventType, context })
}
