import { sequelize } from "../config/database"
// Importation des modèles avec leur export par défaut
import CompanyModel, { Company } from "./company"
import ContactModel, { Contact } from "./contact"
import NoteModel, { Note } from "./note"
import ReminderModel, { Reminder } from "./reminder"
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
TenantModel.hasMany(ReminderModel, { foreignKey: "tenantId" })

// Relations User
UserModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
UserModel.belongsTo(RoleModel, { foreignKey: "roleId" })
UserModel.hasMany(ContactModel, { foreignKey: "assignedToId" })
UserModel.hasMany(CompanyModel, { foreignKey: "assignedToId" })
UserModel.hasMany(NoteModel, { foreignKey: "createdById" })
UserModel.hasMany(ReminderModel, { foreignKey: "createdById" })
UserModel.hasMany(ReminderModel, { foreignKey: "assignedToId", as: "assignedReminders" })

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
ContactModel.hasMany(ReminderModel, { foreignKey: "contactId" })

// Relations Company
CompanyModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
CompanyModel.belongsTo(StatusModel, { foreignKey: "statusId" })
CompanyModel.belongsTo(UserModel, { as: "assignedTo", foreignKey: "assignedToId" })
CompanyModel.hasMany(ContactModel, { foreignKey: "companyId" })
CompanyModel.hasMany(NoteModel, { foreignKey: "companyId" })
CompanyModel.hasMany(ReminderModel, { foreignKey: "companyId" })

// Relations Note
NoteModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
NoteModel.belongsTo(ContactModel, { foreignKey: "contactId" })
NoteModel.belongsTo(CompanyModel, { foreignKey: "companyId" })
NoteModel.belongsTo(UserModel, { as: "createdBy", foreignKey: "createdById" })

// Relations Reminder
ReminderModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
ReminderModel.belongsTo(ContactModel, { foreignKey: "contactId" })
ReminderModel.belongsTo(CompanyModel, { foreignKey: "companyId" })
ReminderModel.belongsTo(UserModel, { as: "createdBy", foreignKey: "createdById" })
ReminderModel.belongsTo(UserModel, { as: "assignedTo", foreignKey: "assignedToId" })

// Export des modèles
export { Company, Contact, Note, Reminder, Role, sequelize, Status, Tenant, User }
