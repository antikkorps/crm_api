import { sequelize } from "../config/database"
// Importation des modèles avec leur export par défaut
import ActivityModel, { Activity } from "./activity"
import CompanyModel, { Company } from "./company"
import ContactModel, { Contact } from "./contact"
import ContactSegmentModel, { ContactSegment } from "./contactSegment"
import NoteModel, { Note } from "./note"
import ReminderModel, { Reminder } from "./reminder"
import RoleModel, { Role } from "./role"
import SegmentModel, { Segment } from "./segment"
import StatusModel, { Status } from "./status"
import TenantModel, { Tenant } from "./tenant"
import UserModel, { User } from "./user"
import WorkflowModel, { Workflow } from "./workflow"
import WorkflowActionModel, { WorkflowAction } from "./workflowAction"
import WorkflowExecutionModel, { WorkflowExecution } from "./workflowExecution"
import WorkflowTriggerModel, { WorkflowTrigger } from "./workflowTrigger"

// Relations Tenant
TenantModel.hasMany(UserModel, { foreignKey: "tenantId" })
TenantModel.hasMany(RoleModel, { foreignKey: "tenantId" })
TenantModel.hasMany(StatusModel, { foreignKey: "tenantId" })
TenantModel.hasMany(ContactModel, { foreignKey: "tenantId" })
TenantModel.hasMany(CompanyModel, { foreignKey: "tenantId" })
TenantModel.hasMany(NoteModel, { foreignKey: "tenantId" })
TenantModel.hasMany(ActivityModel, { foreignKey: "tenantId" })
TenantModel.hasMany(SegmentModel, { foreignKey: "tenantId" })
TenantModel.hasMany(ReminderModel, { foreignKey: "tenantId" })
TenantModel.hasMany(WorkflowModel, { foreignKey: "tenantId" })

// Relations User
UserModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
UserModel.belongsTo(RoleModel, { foreignKey: "roleId" })
UserModel.hasMany(ContactModel, { foreignKey: "assignedToId" })
UserModel.hasMany(CompanyModel, { foreignKey: "assignedToId" })
UserModel.hasMany(NoteModel, { foreignKey: "createdById" })
UserModel.hasMany(ActivityModel, { foreignKey: "createdById" })
UserModel.hasMany(ActivityModel, { foreignKey: "assignedToId", as: "assignedActivities" })
UserModel.hasMany(SegmentModel, { foreignKey: "createdById" })
UserModel.hasMany(ReminderModel, { foreignKey: "createdById" })
UserModel.hasMany(ReminderModel, { foreignKey: "assignedToId", as: "assignedReminders" })
UserModel.hasMany(WorkflowModel, { foreignKey: "createdById" })

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
ContactModel.hasMany(ActivityModel, { foreignKey: "contactId" })
ContactModel.hasMany(ReminderModel, { foreignKey: "contactId" })
ContactModel.belongsToMany(SegmentModel, {
  through: ContactSegmentModel,
  foreignKey: "contactId",
  otherKey: "segmentId",
})

// Relations Company
CompanyModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
CompanyModel.belongsTo(StatusModel, { foreignKey: "statusId" })
CompanyModel.belongsTo(UserModel, { as: "assignedTo", foreignKey: "assignedToId" })
CompanyModel.hasMany(ContactModel, { foreignKey: "companyId" })
CompanyModel.hasMany(NoteModel, { foreignKey: "companyId" })
CompanyModel.hasMany(ActivityModel, { foreignKey: "companyId" })
CompanyModel.hasMany(ReminderModel, { foreignKey: "companyId" })

// Relations Note
NoteModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
NoteModel.belongsTo(ContactModel, { foreignKey: "contactId" })
NoteModel.belongsTo(CompanyModel, { foreignKey: "companyId" })
NoteModel.belongsTo(UserModel, { as: "createdBy", foreignKey: "createdById" })

// Relations Activity
ActivityModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
ActivityModel.belongsTo(ContactModel, { foreignKey: "contactId" })
ActivityModel.belongsTo(CompanyModel, { foreignKey: "companyId" })
ActivityModel.belongsTo(UserModel, { as: "createdBy", foreignKey: "createdById" })
ActivityModel.belongsTo(UserModel, { as: "assignedTo", foreignKey: "assignedToId" })

// Relations Segment
SegmentModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
SegmentModel.belongsTo(UserModel, { as: "createdBy", foreignKey: "createdById" })
SegmentModel.belongsToMany(ContactModel, {
  through: ContactSegmentModel,
  foreignKey: "segmentId",
  otherKey: "contactId",
})

// Relations Reminder
ReminderModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
ReminderModel.belongsTo(ContactModel, { foreignKey: "contactId" })
ReminderModel.belongsTo(CompanyModel, { foreignKey: "companyId" })
ReminderModel.belongsTo(UserModel, { as: "createdBy", foreignKey: "createdById" })
ReminderModel.belongsTo(UserModel, { as: "assignedTo", foreignKey: "assignedToId" })

// Relations Workflow
WorkflowModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
WorkflowModel.belongsTo(UserModel, { as: "createdBy", foreignKey: "createdById" })
WorkflowModel.hasMany(WorkflowTriggerModel, { foreignKey: "workflowId" })
WorkflowModel.hasMany(WorkflowActionModel, { foreignKey: "workflowId" })
WorkflowModel.hasMany(WorkflowExecutionModel, { foreignKey: "workflowId" })

// Relations WorkflowTrigger
WorkflowTriggerModel.belongsTo(WorkflowModel, { foreignKey: "workflowId" })
WorkflowTriggerModel.hasMany(WorkflowExecutionModel, { foreignKey: "triggerId" })

// Relations WorkflowAction
WorkflowActionModel.belongsTo(WorkflowModel, { foreignKey: "workflowId" })

// Relations WorkflowExecution
WorkflowExecutionModel.belongsTo(WorkflowModel, { foreignKey: "workflowId" })
WorkflowExecutionModel.belongsTo(WorkflowTriggerModel, { foreignKey: "triggerId" })
WorkflowExecutionModel.belongsTo(TenantModel, { foreignKey: "tenantId" })

// Export des modèles
export {
  Activity,
  Company,
  Contact,
  ContactSegment,
  Note,
  Reminder,
  Role,
  Segment,
  sequelize,
  Status,
  Tenant,
  User,
  Workflow,
  WorkflowAction,
  WorkflowExecution,
  WorkflowTrigger,
}
