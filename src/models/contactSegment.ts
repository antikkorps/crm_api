import { DataTypes } from "sequelize"
import { sequelize } from "../config/database"

export const ContactSegment = sequelize.define(
  "ContactSegment",
  {
    contactId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "contacts",
        key: "id",
      },
      primaryKey: true,
    },
    segmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "segments",
        key: "id",
      },
      primaryKey: true,
    },
    // Indique si l'ajout a été fait manuellement ou par application des règles
    isManuallyAdded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    addedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "contact_segments",
    timestamps: false,
  }
)

export default ContactSegment
