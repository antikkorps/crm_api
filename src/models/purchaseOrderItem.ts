import { DataTypes, Model } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

export interface PurchaseOrderItemInstance extends Model {
  id: string
  purchaseOrderId: string
  quoteItemId?: string
  productId?: string
  description: string
  quantity: number
  unitPrice: number
  discount?: number
  discountType?: "PERCENTAGE" | "FIXED"
  taxRate?: number
  totalPrice: number
  invoicedQuantity: number
  position: number
  createdAt: Date
  updatedAt: Date
}

export const PurchaseOrderItem = sequelize.define(
  "PurchaseOrderItem",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    purchaseOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "purchase_orders",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    quoteItemId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "quote_items",
        key: "id",
      },
      comment: "Élément de devis d'origine si converti depuis un devis",
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "products",
        key: "id",
      },
      comment: "Produit ou service associé (optionnel)",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Description de l'élément",
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
      comment: "Quantité commandée",
    },
    unitPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: "Prix unitaire",
    },
    discount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Montant ou pourcentage de remise sur cet élément",
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
    totalPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: "Prix total pour cet élément (incluant remises)",
    },
    invoicedQuantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Quantité déjà facturée",
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Position de l'élément dans le bon de commande",
    },
  },
  {
    tableName: "purchase_order_items",
    hooks: {
      // Hook pour calculer automatiquement le prix total avant la création/mise à jour
      beforeValidate: (item: any) => {
        // Calculer le prix total si nécessaire
        if (!item.totalPrice) {
          let total = Number(item.unitPrice) * Number(item.quantity)

          // Appliquer la remise si définie
          if (item.discount && item.discountType) {
            if (item.discountType === "PERCENTAGE") {
              total = total * (1 - Number(item.discount) / 100)
            } else if (item.discountType === "FIXED") {
              total = Math.max(0, total - Number(item.discount))
            }
          }

          item.totalPrice = total
        }
      },
    },
  }
) as unknown as typeof Model & { new (): PurchaseOrderItemInstance }

export default PurchaseOrderItem
