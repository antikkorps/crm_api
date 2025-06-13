import { DataTypes, Model } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"
import { Speciality } from "./speciality"

export interface CompanyInstance extends Model {
  id: string
  client_number?: string
  name: string
  description?: string
  website?: string
  client_group?: string
  industry?: string
  address?: string
  address_complement?: string
  city?: string
  zipCode?: string
  code_regional?: string
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
    client_number: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Numéro de client unique pour l'entreprise",
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
    client_group: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Groupe de clients auquel appartient l'entreprise",
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address_complement: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Complément d'adresse de l'entreprise",
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    code_regional: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Code régional de l'entreprise",
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
