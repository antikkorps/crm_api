import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

export const Segment = sequelize.define(
  "Segment",
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
    // Les règles de segmentation stockées sous forme de JSON
    rules: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Indique si le segment est mis à jour dynamiquement
    isDynamic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Indique quand la dernière évaluation des règles a eu lieu
    lastEvaluatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Le nombre de contacts dans ce segment (mise en cache pour les performances)
    contactCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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
    tableName: "segments",
  }
)

export default Segment
