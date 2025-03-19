import { sequelize } from "../config/database"
// Importation des modèles avec leur export par défaut
import CompanyModel, { Company } from "./company"
import ContactModel, { Contact } from "./contact"
import NoteModel, { Note } from "./note"
import RoleModel, { Role } from "./role"
import StatusModel, { Status } from "./status"
import TenantModel, { Tenant } from "./tenant"
import UserModel, { User } from "./user"

// Relations Tenant
TenantModel.hasMany(UserModel, { foreignKey: "tenantId" })
TenantModel.hasMany(RoleModel, { foreignKey: "tenantId" })
TenantModel.hasMany(StatusModel, { foreignKey: "tenantId" })
TenantModel.hasMany(ContactModel, { foreignKey: "tenantId" })
TenantModel.hasMany(CompanyModel, { foreignKey: "tenantId" })
TenantModel.hasMany(NoteModel, { foreignKey: "tenantId" })

// Relations User
UserModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
UserModel.belongsTo(RoleModel, { foreignKey: "roleId" })
UserModel.hasMany(ContactModel, { foreignKey: "assignedToId" })
UserModel.hasMany(CompanyModel, { foreignKey: "assignedToId" })
UserModel.hasMany(NoteModel, { foreignKey: "createdById" })

// Relations Role
RoleModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
RoleModel.hasMany(UserModel, { foreignKey: "roleId" })

// Relations Status
StatusModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
StatusModel.hasMany(ContactModel, { foreignKey: "statusId" })
StatusModel.hasMany(CompanyModel, { foreignKey: "statusId" })

// Relations Contact
ContactModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
ContactModel.belongsTo(StatusModel, { foreignKey: "statusId" })
ContactModel.belongsTo(CompanyModel, { as: "company", foreignKey: "companyId" })
ContactModel.belongsTo(UserModel, { as: "assignedTo", foreignKey: "assignedToId" })
ContactModel.hasMany(NoteModel, { foreignKey: "contactId" })

// Relations Company
CompanyModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
CompanyModel.belongsTo(StatusModel, { foreignKey: "statusId" })
CompanyModel.belongsTo(UserModel, { as: "assignedTo", foreignKey: "assignedToId" })
CompanyModel.hasMany(ContactModel, { foreignKey: "companyId" })
CompanyModel.hasMany(NoteModel, { foreignKey: "companyId" })

// Relations Note
NoteModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
NoteModel.belongsTo(ContactModel, { foreignKey: "contactId" })
NoteModel.belongsTo(CompanyModel, { foreignKey: "companyId" })
NoteModel.belongsTo(UserModel, { as: "createdBy", foreignKey: "createdById" })

// Export des modèles
export { Company, Contact, Note, Role, sequelize, Status, Tenant, User }
