import { sequelize } from "../config/database"
import { Company } from "./company"
import { Contact } from "./contact"
import { Note } from "./note"
import { Role } from "./role"
import { Status } from "./status"
import { Tenant } from "./tenant"
import { User } from "./user"

// Relations Tenant
Tenant.hasMany(User, { foreignKey: "tenantId" })
Tenant.hasMany(Role, { foreignKey: "tenantId" })
Tenant.hasMany(Status, { foreignKey: "tenantId" })
Tenant.hasMany(Contact, { foreignKey: "tenantId" })
Tenant.hasMany(Company, { foreignKey: "tenantId" })
Tenant.hasMany(Note, { foreignKey: "tenantId" })

// Relations User
User.belongsTo(Tenant, { foreignKey: "tenantId" })
User.belongsTo(Role, { foreignKey: "roleId" })
User.hasMany(Contact, { foreignKey: "assignedToId" })
User.hasMany(Company, { foreignKey: "assignedToId" })
User.hasMany(Note, { foreignKey: "createdById" })

// Relations Role
Role.belongsTo(Tenant, { foreignKey: "tenantId" })
Role.hasMany(User, { foreignKey: "roleId" })

// Relations Status
Status.belongsTo(Tenant, { foreignKey: "tenantId" })
Status.hasMany(Contact, { foreignKey: "statusId" })
Status.hasMany(Company, { foreignKey: "statusId" })

// Relations Contact
Contact.belongsTo(Tenant, { foreignKey: "tenantId" })
Contact.belongsTo(Status, { foreignKey: "statusId" })
Contact.belongsTo(Company, { as: "company", foreignKey: "companyId" })
Contact.belongsTo(User, { as: "assignedTo", foreignKey: "assignedToId" })
Contact.hasMany(Note, { foreignKey: "contactId" })

// Relations Company
Company.belongsTo(Tenant, { foreignKey: "tenantId" })
Company.belongsTo(Status, { foreignKey: "statusId" })
Company.belongsTo(User, { as: "assignedTo", foreignKey: "assignedToId" })
Company.hasMany(Contact, { foreignKey: "companyId" })
Company.hasMany(Note, { foreignKey: "companyId" })

// Relations Note
Note.belongsTo(Tenant, { foreignKey: "tenantId" })
Note.belongsTo(Contact, { foreignKey: "contactId" })
Note.belongsTo(Company, { foreignKey: "companyId" })
Note.belongsTo(User, { as: "createdBy", foreignKey: "createdById" })

// Export des modèles
export { Company, Contact, Note, Role, sequelize, Status, Tenant, User }
