import { DataTypes, Model } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

export enum PurchaseOrderStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PARTIALLY_INVOICED = "PARTIALLY_INVOICED",
  FULLY_INVOICED = "FULLY_INVOICED",
  CANCELLED = "CANCELLED",
}

export interface PurchaseOrderInstance extends Model {
  id: string
  reference: string
  title: string
  description?: string
  status:
    | "DRAFT"
    | "SENT"
    | "APPROVED"
    | "REJECTED"
    | "PARTIALLY_INVOICED"
    | "FULLY_INVOICED"
    | "CANCELLED"
  quoteId?: string
  companyId: string
  contactId?: string
  validUntil?: Date
  totalAmount: number
  discountAmount?: number
  discountType?: "PERCENTAGE" | "FIXED"
  taxRate?: number
  taxes?: number
  notes?: string
  terms?: string
  termsAndConditionsId?: string
  clientReference?: string
  assignedToId?: string
  tenantId: string
  createdAt: Date
  updatedAt: Date
  toJSON(): any
}

export const PurchaseOrder = sequelize.define(
  "PurchaseOrder",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Référence unique du bon de commande (générée automatiquement)",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Titre du bon de commande",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Description détaillée du bon de commande",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "DRAFT",
      comment: "Statut actuel du bon de commande",
      validate: {
        isIn: [
          [
            "DRAFT",
            "SENT",
            "APPROVED",
            "REJECTED",
            "PARTIALLY_INVOICED",
            "FULLY_INVOICED",
            "CANCELLED",
          ],
        ],
      },
    },
    quoteId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "quotes",
        key: "id",
      },
      comment: "Devis d'origine si le bon de commande a été converti depuis un devis",
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "companies",
        key: "id",
      },
      comment: "Entreprise cliente concernée par le bon de commande",
    },
    contactId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "contacts",
        key: "id",
      },
      comment: "Contact principal pour ce bon de commande",
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date de validité du bon de commande",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Montant total du bon de commande",
    },
    discountAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Montant ou pourcentage de remise",
    },
    discountType: {
      type: DataTypes.STRING,
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
    taxes: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      comment: "Montant total des taxes",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Notes ou commentaires sur le bon de commande",
    },
    terms: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Conditions générales spécifiques à ce bon de commande",
    },
    termsAndConditionsId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "terms_and_conditions",
        key: "id",
      },
      comment: "Conditions générales associées",
    },
    clientReference: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Référence du client pour ce bon de commande",
    },
    assignedToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      comment: "Utilisateur responsable du bon de commande",
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "tenants",
        key: "id",
      },
      comment: "Tenant auquel appartient ce bon de commande",
    },
  },
  {
    tableName: "purchase_orders",
    indexes: [
      {
        name: "purchase_orders_tenant_id_idx",
        fields: ["tenantId"],
      },
      {
        name: "purchase_orders_company_id_idx",
        fields: ["companyId"],
      },
      {
        name: "purchase_orders_reference_idx",
        fields: ["reference"],
      },
      {
        name: "purchase_orders_quote_id_idx",
        fields: ["quoteId"],
      },
    ],
  }
) as unknown as typeof Model & { new (): PurchaseOrderInstance }

export default PurchaseOrder
