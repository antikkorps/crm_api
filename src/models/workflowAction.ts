import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

// Types d'actions supportés
export enum ActionType {
  UPDATE_CONTACT = "UPDATE_CONTACT",
  UPDATE_COMPANY = "UPDATE_COMPANY",
  CREATE_ACTIVITY = "CREATE_ACTIVITY",
  CREATE_REMINDER = "CREATE_REMINDER",
  SEND_EMAIL = "SEND_EMAIL",
  ADD_TO_SEGMENT = "ADD_TO_SEGMENT",
  REMOVE_FROM_SEGMENT = "REMOVE_FROM_SEGMENT",
  ASSIGN_TO_USER = "ASSIGN_TO_USER",
  WEBHOOK = "WEBHOOK",
  DELAY = "DELAY",
}

export const WorkflowAction = sequelize.define(
  "WorkflowAction",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    workflowId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "workflows",
        key: "id",
      },
    },
    actionType: {
      type: DataTypes.ENUM(...Object.values(ActionType)),
      allowNull: false,
    },
    // Ordre d'exécution dans le workflow
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Paramètres de l'action au format JSON
    params: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    // Pour les actions conditionnelles
    executeCondition: {
      type: DataTypes.JSONB,
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
    tableName: "workflow_actions",
  }
)

export default WorkflowAction
