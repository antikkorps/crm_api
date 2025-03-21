import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

/**
 * Modèle pour stocker les associations entre utilisateurs CRM et services externes
 */
export const UserIntegration = sequelize.define(
  "UserIntegration",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    integrationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "external_integrations",
        key: "id",
      },
    },
    externalUserId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "ID de l'utilisateur dans le système externe",
    },
    externalUserData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Données supplémentaires de l'utilisateur dans le système externe",
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: "user_integrations",
  }
)

export default UserIntegration
