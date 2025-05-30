import { CreateOptions, DataTypes, Model, UpdateOptions } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"
import { QuoteHistory } from "./quoteHistory"

// Enum pour les statuts de devis
export enum QuoteStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  CONVERTED = "CONVERTED",
  CANCELLED = "CANCELLED",
}

export interface QuoteInstance extends Model {
  id: string
  reference: string
  title: string
  description?: string
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "CONVERTED" | "CANCELLED"
  companyId: string
  contactId?: string
  validUntil?: Date
  totalAmount: number
  discountAmount?: number
  discountType?: "PERCENTAGE" | "FIXED"
  taxRate?: number
  notes?: string
  terms?: string
  termsAndConditionsId?: string
  assignedToId?: string
  version: number
  tenantId: string
  createdAt: Date
  updatedAt: Date
  convertedToId?: string
  convertedToType?: "PURCHASE_ORDER" | "INVOICE"
  opportunityId?: string
  taxes?: number
  QuoteItems?: any[]
  toJSON(): any
}

interface CustomOptions {
  userId?: string
  _previousData?: any
}

type CustomCreateOptions = CreateOptions<any> & CustomOptions
type CustomUpdateOptions = UpdateOptions<any> & CustomOptions

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
      comment: "Référence unique du devis (générée automatiquement)",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Titre du devis",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Description détaillée du devis",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "DRAFT",
      comment: "Statut actuel du devis",
      validate: {
        isIn: [["DRAFT", "SENT", "ACCEPTED", "REJECTED", "CONVERTED", "CANCELLED"]],
      },
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "companies",
        key: "id",
      },
      comment: "Entreprise cliente concernée par le devis",
    },
    contactId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "contacts",
        key: "id",
      },
      comment: "Contact principal pour ce devis",
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date de validité du devis",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Montant total du devis",
    },
    discountAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Montant ou pourcentage de remise",
    },
    discountType: {
      type: DataTypes.STRING, // Utiliser STRING au lieu de ENUM
      allowNull: true,
      comment: "Type de remise (pourcentage ou montant fixe)",
      validate: {
        isIn: [["PERCENTAGE", "FIXED"]],
      },
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 20.0,
      comment: "Taux de TVA applicable",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Notes ou commentaires sur le devis",
    },
    terms: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Conditions générales spécifiques à ce devis",
    },
    termsAndConditionsId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "terms_and_conditions",
        key: "id",
      },
      comment: "Conditions générales de vente associées",
    },
    assignedToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      comment: "Utilisateur responsable du devis",
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: "Version actuelle du devis",
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "tenants",
        key: "id",
      },
      comment: "Tenant auquel appartient ce devis",
    },
    convertedToId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "ID de l'entité vers laquelle ce devis a été converti",
    },
    convertedToType: {
      type: DataTypes.STRING, // Utiliser STRING au lieu de ENUM
      allowNull: true,
      comment: "Type d'entité vers lequel ce devis a été converti",
      validate: {
        isIn: [["PURCHASE_ORDER", "INVOICE"]],
      },
    },
    opportunityId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "opportunities",
        key: "id",
      },
      comment: "Opportunité associée à ce devis",
    },
    taxes: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      comment: "Montant total des taxes",
    },
  },
  {
    tableName: "quotes",
    hooks: {
      // Hook pour enregistrer l'historique lors de la création
      afterCreate: async (quote: any, options: any) => {
        try {
          // Récupérer userId à partir des options personnalisées
          const userId = (options as CustomCreateOptions).userId || null

          await QuoteHistory.create({
            quoteId: quote.id,
            userId: userId,
            version: 1,
            changeType: "CREATED",
            previousData: null,
            newData: quote.toJSON(),
            changedFields: Object.keys(quote.toJSON()).filter(
              (key) => !["id", "createdAt", "updatedAt"].includes(key)
            ),
          })
        } catch (error) {
          console.error("Error creating quote history:", error)
        }
      },

      // Hook pour enregistrer l'historique lors de la mise à jour
      beforeUpdate: async (quote: any, options: any) => {
        try {
          const typedOptions = options as CustomUpdateOptions

          // Stocker l'état précédent pour l'historique
          const previousData = await Quote.findByPk(quote.id)
          if (previousData) {
            typedOptions._previousData = previousData.toJSON()
          }
        } catch (error) {
          console.error("Error in beforeUpdate hook:", error)
        }
      },

      afterUpdate: async (quote: any, options: any) => {
        try {
          const typedOptions = options as CustomUpdateOptions
          const userId = typedOptions.userId || null
          const previousData = typedOptions._previousData

          if (!previousData) return

          const newData = quote.toJSON()
          const changedFields = Object.keys(newData).filter(
            (key) =>
              !["updatedAt"].includes(key) &&
              JSON.stringify(previousData[key]) !== JSON.stringify(newData[key])
          )

          if (changedFields.length === 0) return

          const changeType = changedFields.includes("status")
            ? "STATUS_CHANGED"
            : changedFields.includes("convertedToId")
            ? "CONVERTED"
            : "UPDATED"

          await QuoteHistory.create({
            quoteId: quote.id,
            userId: userId,
            version: newData.version,
            changeType,
            previousData,
            newData,
            changedFields,
          })
        } catch (error) {
          console.error("Error creating quote update history:", error)
        }
      },
    },
  }
) as unknown as typeof Model & { new (): QuoteInstance }

export default Quote
