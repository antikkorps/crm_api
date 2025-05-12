import { DataTypes, Model } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"
import { Speciality } from "./speciality"

export interface CompanyInstance extends Model {
  id: string
  name: string
  description?: string
  website?: string
  industry?: string
  address?: string
  city?: string
  zipCode?: string
  country?: string
  size?: string
  operatingRooms?: number
  globalRevenue?: number
  statusId: string
  assignedToId?: string
  tenantId: string
  createdAt: Date
  updatedAt: Date

  // Méthodes d'association
  setSpecialities: (specialityIds: string[]) => Promise<void>
  getSpecialities: () => Promise<(typeof Speciality)[]>
  addSpeciality: (speciality: typeof Speciality) => Promise<void>
  removeSpeciality: (speciality: typeof Speciality) => Promise<void>
}

export const Company = sequelize.define(
  "Company",
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
    website: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    size: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Taille de l'entreprise en nombre d'employés",
    },
    operatingRooms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Salles d'opération de l'entreprise",
    },
    globalRevenue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Chiffre d'affaires annuel global de l'entreprise",
    },
    statusId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "statuses",
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
    tableName: "companies",
  }
) as unknown as typeof Model & {
  new (): CompanyInstance
}

export default Company
