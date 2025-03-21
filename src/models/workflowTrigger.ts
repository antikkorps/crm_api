import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

// Types de déclencheurs supportés
export enum TriggerType {
  CONTACT_CREATED = "CONTACT_CREATED",
  CONTACT_UPDATED = "CONTACT_UPDATED",
  CONTACT_STATUS_CHANGED = "CONTACT_STATUS_CHANGED",
  COMPANY_CREATED = "COMPANY_CREATED",
  COMPANY_UPDATED = "COMPANY_UPDATED",
  COMPANY_STATUS_CHANGED = "COMPANY_STATUS_CHANGED",
  ACTIVITY_CREATED = "ACTIVITY_CREATED",
  ACTIVITY_COMPLETED = "ACTIVITY_COMPLETED",
  REMINDER_DUE = "REMINDER_DUE",
  SEGMENT_MEMBERSHIP_CHANGED = "SEGMENT_MEMBERSHIP_CHANGED",
}

export const WorkflowTrigger = sequelize.define(
  "WorkflowTrigger",
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
    triggerType: {
      type: DataTypes.ENUM(...Object.values(TriggerType)),
      allowNull: false,
    },
    // Conditions additionnelles au format JSON (ex: si le statut passe à "Client")
    conditions: {
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
    tableName: "workflow_triggers",
  }
)

export default WorkflowTrigger
