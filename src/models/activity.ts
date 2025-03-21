import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

export const Activity = sequelize.define(
  "Activity",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    type: {
      type: DataTypes.ENUM("NOTE", "CALL", "EMAIL", "MEETING", "TASK"),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Champs pour les appels téléphoniques
    duration: {
      type: DataTypes.INTEGER, // Durée en secondes
      allowNull: true,
    },
    callDirection: {
      type: DataTypes.ENUM("INBOUND", "OUTBOUND"),
      allowNull: true,
    },
    callOutcome: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Champs pour les emails
    emailSubject: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailSender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailRecipients: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    emailStatus: {
      type: DataTypes.ENUM("DRAFT", "SENT", "OPENED", "REPLIED"),
      allowNull: true,
    },
    // Champs pour les réunions
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    attendees: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Peut stocker des noms, emails ou IDs
      allowNull: true,
    },
    meetingOutcome: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Champs pour les tâches
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
      allowNull: true,
    },
    taskStatus: {
      type: DataTypes.ENUM("TODO", "IN_PROGRESS", "DONE", "CANCELED"),
      allowNull: true,
    },
    assignedToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    // Relations communes
    contactId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "contacts",
        key: "id",
      },
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "companies",
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
    tableName: "activities",
    // Hooks pour valider les champs en fonction du type
    hooks: {
      beforeValidate: (activity: any) => {
        switch (activity.type) {
          case "CALL":
            if (
              activity.callDirection &&
              !["INBOUND", "OUTBOUND"].includes(activity.callDirection)
            ) {
              throw new Error("Invalid call direction")
            }
            break
          case "EMAIL":
            if (
              activity.emailStatus &&
              !["DRAFT", "SENT", "OPENED", "REPLIED"].includes(activity.emailStatus)
            ) {
              throw new Error("Invalid email status")
            }
            break
          case "TASK":
            if (
              activity.priority &&
              !["LOW", "MEDIUM", "HIGH"].includes(activity.priority)
            ) {
              throw new Error("Invalid task priority")
            }
            if (
              activity.taskStatus &&
              !["TODO", "IN_PROGRESS", "DONE", "CANCELED"].includes(activity.taskStatus)
            ) {
              throw new Error("Invalid task status")
            }
            break
        }
      },
    },
  }
)

export default Activity
