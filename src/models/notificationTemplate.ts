import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"
import { NotificationChannel, NotificationType } from "./notification"

export const NotificationTemplate = sequelize.define(
  "NotificationTemplate",
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
    // Code unique pour référencer le template programmatiquement
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    // Le sujet/titre du template (peut contenir des variables)
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Le contenu du template (peut contenir des variables)
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Type de notification
    type: {
      type: DataTypes.ENUM(...Object.values(NotificationType)),
      allowNull: false,
      defaultValue: NotificationType.INFO,
    },
    // Canal de notification par défaut
    defaultChannel: {
      type: DataTypes.ENUM(...Object.values(NotificationChannel)),
      allowNull: false,
      defaultValue: NotificationChannel.EMAIL,
    },
    // Définition des variables attendues par le template
    variables: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "tenants",
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
    tableName: "notification_templates",
  }
)

export default NotificationTemplate
