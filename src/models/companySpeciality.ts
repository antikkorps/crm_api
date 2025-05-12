import { DataTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"

export const CompanySpeciality = sequelize.define(
  "CompanySpeciality",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "companies",
        key: "id",
      },
    },
    specialityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "specialities",
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
    tableName: "company_specialities",
    indexes: [
      {
        unique: true,
        fields: ["companyId", "specialityId"],
      },
    ],
  }
)

export default CompanySpeciality
