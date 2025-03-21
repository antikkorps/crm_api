import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

/**
 * Modèle pour stocker les intégrations externes
 */
export const ExternalIntegration = sequelize.define(
  "ExternalIntegration",
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
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Type d'intégration (ex: lms, crm, email, etc.)",
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Fournisseur du service (ex: digiforma, moodle, etc.)",
    },
    configuration: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    apiKey: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    apiSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    baseUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    enabled: {
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
    lastSyncedAt: {
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
    tableName: "external_integrations",
  }
)

export default ExternalIntegration
