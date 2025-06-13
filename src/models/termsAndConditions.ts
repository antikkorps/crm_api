import { DataTypes, Model } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

export interface TermsAndConditionsInstance extends Model {
  id: string
  title: string
  content: string
  isDefault: boolean
  tenantId: string
  createdAt: Date
  updatedAt: Date
  toJSON(): any
}

export const TermsAndConditions = sequelize.define(
  "TermsAndConditions",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Titre des conditions générales de vente",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Contenu des conditions générales de vente",
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Indique si ces conditions sont les conditions par défaut",
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "tenants",
        key: "id",
      },
    },
  },
  {
    tableName: "terms_and_conditions",
  }
) as unknown as typeof Model & { new (): TermsAndConditionsInstance }

export default TermsAndConditions
