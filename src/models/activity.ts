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
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Type of activity: CALL, MEETING, TASK, EMAIL, NOTE, etc.",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Dates importantes
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "For meetings, calls, etc.",
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "For meetings, calls, etc.",
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "For tasks",
    },

    // Champs spécifiques pour les activités de type CALL
    callDirection: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "INBOUND or OUTBOUND",
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Call duration in minutes",
    },
    callOutcome: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Champs spécifiques pour les activités de type MEETING
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    attendees: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Champs spécifiques pour les activités de type TASK
    priority: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "LOW, MEDIUM, HIGH",
    },
    taskStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "PENDING, IN_PROGRESS, COMPLETED, CANCELLED",
    },

    // Champs spécifiques pour les activités de type EMAIL
    emailSubject: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "DRAFT, SENT, OPENED, CLICKED, BOUNCED",
    },

    // Relations
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
    assignedToId: {
      type: DataTypes.UUID,
      allowNull: true,
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
  }
)

export default Activity
