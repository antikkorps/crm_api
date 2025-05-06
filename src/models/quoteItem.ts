import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

export const QuoteItem = sequelize.define(
  "QuoteItem",
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
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Nom du produit ou service",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Description détaillée du produit ou service",
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
      comment: "Quantité commandée",
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Prix unitaire hors taxe",
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: "Taux de TVA applicable (en pourcentage)",
    },
    discount: {
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
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Montant total de la ligne (quantité × prix unitaire - remise)",
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Position de l'élément dans le devis pour l'ordre d'affichage",
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
    tableName: "quote_items",
    hooks: {
      beforeValidate: (item: any) => {
        // Calculer automatiquement le total si non fourni
        if (item.unitPrice !== undefined && item.quantity !== undefined) {
          let total = Number(item.unitPrice) * Number(item.quantity)

          // Appliquer la remise si présente
          if (item.discount && item.discountType) {
            if (item.discountType === "percentage") {
              total = total * (1 - Number(item.discount) / 100)
            } else if (item.discountType === "fixed") {
              total = Math.max(0, total - Number(item.discount))
            }
          }

          item.total = total
        }
      },
    },
  }
)

export default QuoteItem
