import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

// Statut d'un webhook
export enum WebhookStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ERROR = "ERROR",
}

// Types d'événements qui peuvent déclencher le webhook
export enum WebhookEvent {
  CONTACT_CREATED = "contact.created",
  CONTACT_UPDATED = "contact.updated",
  COMPANY_CREATED = "company.created",
  COMPANY_UPDATED = "company.updated",
  DEAL_CREATED = "deal.created",
  DEAL_UPDATED = "deal.updated",
  DEAL_STAGE_CHANGED = "deal.stage_changed",
  NOTIFICATION_CREATED = "notification.created",
  CUSTOM_EVENT = "custom.event",
}

export const Webhook = sequelize.define(
  "Webhook",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    events: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    // En-têtes HTTP à inclure dans les requêtes
    headers: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Secret pour signer les requêtes webhook (HMAC)
    secret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Configuration des tentatives en cas d'échec
    retryConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        maxRetries: 3,
        retryIntervalMinutes: 5,
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(WebhookStatus)),
      allowNull: false,
      defaultValue: WebhookStatus.ACTIVE,
    },
    // Date de la dernière tentative d'envoi
    lastAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Résultat de la dernière tentative
    lastAttemptResult: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Statistiques d'exécution
    stats: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
      },
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "tenants",
        key: "id",
      },
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "webhooks",
  }
)

export default Webhook
