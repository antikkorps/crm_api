import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

// Statuts d'exécution possibles
export enum ExecutionStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELED = "CANCELED",
}

export const WorkflowExecution = sequelize.define(
  "WorkflowExecution",
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
    triggerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "workflow_triggers",
        key: "id",
      },
    },
    // Références à l'entité qui a déclenché le workflow
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ExecutionStatus)),
      defaultValue: ExecutionStatus.PENDING,
      allowNull: false,
    },
    // Stocke le contexte d'exécution (variables, résultats intermédiaires, etc.)
    context: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Journal d'exécution détaillé
    log: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: "workflow_executions",
  }
)

export default WorkflowExecution
