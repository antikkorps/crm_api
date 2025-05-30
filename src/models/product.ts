import { DataTypes, Model } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

export interface ProductInstance extends Model {
  id: string
  name: string
  description: string
  code?: string
  category?: string
  unitPrice: number
  taxRate?: number
  isActive: boolean
  tenantId: string
  createdById?: string
  createdAt: Date
  updatedAt: Date
}

export const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Nom du produit ou service",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Description détaillée du produit ou service",
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Code ou référence du produit/service",
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Catégorie du produit ou service",
    },
    unitPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Prix unitaire par défaut",
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 20.0,
      comment: "Taux de TVA par défaut",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Indique si le produit est disponible",
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "tenants",
        key: "id",
      },
      comment: "Tenant auquel appartient ce produit",
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      comment: "Utilisateur ayant créé le produit",
    },
  },
  {
    tableName: "products",
    indexes: [
      {
        name: "products_tenant_id_idx",
        fields: ["tenantId"],
      },
      {
        name: "products_name_idx",
        fields: ["name"],
      },
      {
        name: "products_category_idx",
        fields: ["category"],
      },
    ],
  }
) as unknown as typeof Model & { new (): ProductInstance }

export default Product
