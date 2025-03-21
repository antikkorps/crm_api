import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

// Types de notifications
export enum NotificationType {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

// Statut d'envoi des notifications
export enum NotificationStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  READ = "READ",
}

// Canaux de notification
export enum NotificationChannel {
  EMAIL = "EMAIL",
  WEBHOOK = "WEBHOOK",
  UI = "UI", // Notification interne à l'interface utilisateur
}

export const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(NotificationType)),
      allowNull: false,
      defaultValue: NotificationType.INFO,
    },
    channel: {
      type: DataTypes.ENUM(...Object.values(NotificationChannel)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(NotificationStatus)),
      allowNull: false,
      defaultValue: NotificationStatus.PENDING,
    },
    // Métadonnées spécifiques au canal (e.g. destinataire email, URL webhook)
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Trace d'exécution (tentatives, erreurs, etc.)
    executionLog: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Données contextuelles liées à cette notification
    contextData: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Relations
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Peut être null pour les notifs système
      references: {
        model: "users",
        key: "id",
      },
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "notification_templates",
        key: "id",
      },
    },
    // Pour les webhooks
    webhookId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "webhooks",
        key: "id",
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
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: "notifications",
  }
)

export default Notification
