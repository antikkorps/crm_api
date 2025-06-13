import { DataTypes, Model } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

export interface QuoteItemInstance extends Model {
  id: string
  quoteId: string
  productId?: string
  description: string
  quantity: number
  unitPrice: number
  discount?: number
  discountType?: "PERCENTAGE" | "FIXED"
  taxRate?: number
  totalPrice: number
  position: number
  createdAt: Date
  updatedAt: Date
}

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
      comment: "Quantité",
    },
    unitPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: "Prix unitaire hors taxes",
    },
    discount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Remise sur l'élément",
    },
    discountType: {
      type: DataTypes.STRING, // Utiliser STRING au lieu de ENUM
      allowNull: true,
      validate: {
        isIn: [["PERCENTAGE", "FIXED"]],
      },
      comment: "Type de remise (pourcentage ou montant fixe)",
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: "Taux de TVA spécifique à cet élément (si différent du taux global)",
    },
    totalPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Prix total pour cet élément (calculé automatiquement)",
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Position de l'élément dans le devis",
    },
  },
  {
    tableName: "quote_items",
    hooks: {
      beforeCreate: (item: any) => {
        // Calcule automatiquement le prix total si non défini
        if (!item.totalPrice) {
          let total = item.quantity * item.unitPrice

          // Appliquer la remise si elle existe
          if (item.discount) {
            if (item.discountType === "PERCENTAGE") {
              total = total * (1 - item.discount / 100)
            } else {
              total = total - item.discount
            }
          }

          item.totalPrice = total
        }
      },
      beforeUpdate: (item: any) => {
        // Recalcule le prix total lors de la mise à jour
        let total = item.quantity * item.unitPrice

        // Appliquer la remise si elle existe
        if (item.discount) {
          if (item.discountType === "PERCENTAGE") {
            total = total * (1 - item.discount / 100)
          } else {
            total = total - item.discount
          }
        }

        item.totalPrice = total
      },
      afterCreate: async (item: any, options) => {
        // Mettre à jour le montant total du devis parent
        await updateQuoteTotalAmount(item.quoteId)
      },
      afterUpdate: async (item: any, options) => {
        // Mettre à jour le montant total du devis parent
        await updateQuoteTotalAmount(item.quoteId)
      },
      afterDestroy: async (item: any, options) => {
        // Mettre à jour le montant total du devis parent
        await updateQuoteTotalAmount(item.quoteId)
      },
    },
  }
) as unknown as typeof Model & { new (): QuoteItemInstance }

// Fonction utilitaire pour recalculer le montant total d'un devis
async function updateQuoteTotalAmount(quoteId: string) {
  try {
    const Quote = sequelize.models.Quote
    const items = await QuoteItem.findAll({
      where: { quoteId },
    })

    // Calculer la somme de tous les éléments
    let totalAmount = items.reduce((sum, item) => {
      return sum + Number(item.get("totalPrice"))
    }, 0)

    // Récupérer le devis pour appliquer les remises globales
    const quote = await Quote.findByPk(quoteId)
    if (quote) {
      // Appliquer la remise globale si elle existe
      if (quote.get("discountAmount")) {
        if (quote.get("discountType") === "PERCENTAGE") {
          totalAmount =
            totalAmount * (1 - parseFloat(quote.get("discountAmount") as string) / 100)
        } else {
          totalAmount = totalAmount - parseFloat(quote.get("discountAmount") as string)
        }
      }

      // Mettre à jour le montant total et incrémenter la version
      await quote.update(
        {
          totalAmount,
          version: parseInt(quote.get("version") as string) + 1,
        },
        { hooks: false }
      ) // Éviter une boucle infinie avec hooks: false
    }
  } catch (error) {
    console.error("Error updating quote total amount:", error)
  }
}

export default QuoteItem
