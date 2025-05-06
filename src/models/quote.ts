import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

// États possibles d'un devis
export enum QuoteStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

// Types de remises
export type DiscountType = "percentage" | "fixed"

export const Quote = sequelize.define(
  "Quote",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      defaultValue: () => {
        const currentDate = new Date()
        const year = currentDate.getFullYear().toString().slice(-2)
        const month = String(currentDate.getMonth() + 1).padStart(2, "0")
        const uniqueId = Math.floor(1000 + Math.random() * 9000)
        return `Q${year}${month}-${uniqueId}`
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(QuoteStatus)),
      defaultValue: QuoteStatus.DRAFT,
      allowNull: false,
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxes: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Valeur de la remise (pourcentage ou montant fixe)",
    },
    discountType: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [["percentage", "fixed"]],
      },
      comment: "Type de remise (pourcentage ou montant fixe)",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Notes internes sur le devis",
    },
    terms: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Conditions générales et termes du devis",
    },
    opportunityId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "opportunities",
        key: "id",
      },
    },
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
    tableName: "quotes",
    hooks: {
      beforeCreate: async (quote: any) => {
        // Si pas de référence fournie, en générer une automatiquement
        if (!quote.reference) {
          const currentDate = new Date()
          const year = currentDate.getFullYear().toString().slice(-2)
          const month = String(currentDate.getMonth() + 1).padStart(2, "0")
          const uniqueId = Math.floor(1000 + Math.random() * 9000)
          quote.reference = `Q${year}${month}-${uniqueId}`
        }
      },
    },
  }
)

export default Quote
