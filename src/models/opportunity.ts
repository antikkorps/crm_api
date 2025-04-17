import { DataTypes, Model, Optional } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

interface OpportunityAttributes {
  id: string
  name: string
  description?: string
  value: number
  probability?: number
  statusId: string
  contactId?: string
  companyId?: string
  assignedToId?: string
  tenantId: string
  createdAt: Date
  updatedAt: Date
}

interface OpportunityCreationAttributes
  extends Optional<OpportunityAttributes, "id" | "createdAt" | "updatedAt"> {}

export class Opportunity
  extends Model<OpportunityAttributes, OpportunityCreationAttributes>
  implements OpportunityAttributes
{
  public id!: string
  public name!: string
  public description!: string
  public value!: number
  public probability!: number
  public statusId!: string
  public contactId!: string
  public companyId!: string
  public assignedToId!: string
  public tenantId!: string
  public createdAt!: Date
  public updatedAt!: Date
}

const OpportunityModel = Opportunity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    probability: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    statusId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "statuses",
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
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "opportunities",
    timestamps: true,
  }
)

export default OpportunityModel
