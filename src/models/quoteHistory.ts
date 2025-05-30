import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

export const QuoteHistory = sequelize.define(
  "QuoteHistory",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    quoteId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "quotes",
        key: "id",
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Numéro de version du devis après modification",
    },
    changeType: {
      type: DataTypes.ENUM("CREATED", "UPDATED", "STATUS_CHANGED", "CONVERTED"),
      allowNull: false,
    },
    previousData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "État du devis avant modification",
    },
    newData: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: "État du devis après modification",
    },
    changedFields: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      comment: "Liste des champs modifiés",
    },
  },
  {
    tableName: "quote_history",
    timestamps: true,
  }
)

export default QuoteHistory
