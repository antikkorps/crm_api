import { sequelize } from "../config/database"
// Importation des modèles avec leur export par défaut
import ActivityModel, { Activity } from "./activity"
import CompanyModel, { Company } from "./company"
import CompanySpecialityModel, { CompanySpeciality } from "./companySpeciality"
import ContactModel, { Contact } from "./contact"
import ContactSegmentModel, { ContactSegment } from "./contactSegment"
import ExternalIntegrationModel, { ExternalIntegration } from "./externalIntegration"
import NoteModel, { Note } from "./note"
import NotificationModel, { Notification } from "./notification"
import NotificationTemplateModel, { NotificationTemplate } from "./notificationTemplate"
import OpportunityModel, { Opportunity } from "./opportunity"
import ProductModel, { Product } from "./product"
import PurchaseOrderModel, { PurchaseOrder } from "./purchaseOrder"
import PurchaseOrderItemModel, { PurchaseOrderItem } from "./purchaseOrderItem"
import QuoteModel, { Quote } from "./quote"
import QuoteHistoryModel, { QuoteHistory } from "./quoteHistory"
import QuoteItemModel, { QuoteItem } from "./quoteItem"
import ReminderModel, { Reminder } from "./reminder"
import RoleModel, { Role } from "./role"
import SegmentModel, { Segment } from "./segment"
import SpecialityModel, { Speciality } from "./speciality"
import StatusModel, { Status } from "./status"
import TenantModel, { Tenant } from "./tenant"
import TermsAndConditionsModel, { TermsAndConditions } from "./termsAndConditions"
import UserModel, { User } from "./user"
import UserIntegrationModel, { UserIntegration } from "./userIntegration"
import WebhookModel, { Webhook } from "./webhook"
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
TenantModel.hasMany(ExternalIntegrationModel, { foreignKey: "tenantId" })
TenantModel.hasMany(NotificationModel, { foreignKey: "tenantId" })
TenantModel.hasMany(NotificationTemplateModel, { foreignKey: "tenantId" })
TenantModel.hasMany(WebhookModel, { foreignKey: "tenantId" })
TenantModel.hasMany(OpportunityModel, { foreignKey: "tenantId" })
TenantModel.hasMany(QuoteModel, { foreignKey: "tenantId" })
TenantModel.hasMany(TermsAndConditionsModel, { foreignKey: "tenantId" })
TenantModel.hasMany(ProductModel, { foreignKey: "tenantId" })
TenantModel.hasMany(PurchaseOrderModel, { foreignKey: "tenantId" })

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
UserModel.hasMany(UserIntegrationModel, { foreignKey: "userId" })
UserModel.hasMany(NotificationModel, { foreignKey: "userId" })

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
CompanyModel.belongsTo(StatusModel, { as: "status", foreignKey: "statusId" })
CompanyModel.belongsTo(UserModel, { as: "assignedTo", foreignKey: "assignedToId" })
CompanyModel.hasMany(ContactModel, { foreignKey: "companyId" })
CompanyModel.hasMany(NoteModel, { foreignKey: "companyId" })
CompanyModel.hasMany(ActivityModel, { foreignKey: "companyId" })
CompanyModel.hasMany(ReminderModel, { foreignKey: "companyId" })
CompanyModel.hasMany(OpportunityModel, { foreignKey: "companyId" })
CompanyModel.belongsToMany(SpecialityModel, {
  through: CompanySpecialityModel,
  foreignKey: "companyId",
  otherKey: "specialityId",
})

// Relations Speciality
SpecialityModel.belongsToMany(CompanyModel, {
  through: CompanySpecialityModel,
  foreignKey: "specialityId",
  otherKey: "companyId",
})

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

// Relations pour les intégrations externes
ExternalIntegrationModel.belongsTo(TenantModel, { foreignKey: "tenantId" })

// Relations pour les intégrations utilisateur
UserIntegrationModel.belongsTo(UserModel, { foreignKey: "userId" })
UserIntegrationModel.belongsTo(ExternalIntegrationModel, { foreignKey: "integrationId" })

// Relations pour les notifications
NotificationModel.belongsTo(UserModel, { foreignKey: "userId" })
NotificationTemplateModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
NotificationModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
NotificationModel.belongsTo(NotificationTemplateModel, { foreignKey: "templateId" })

// Relations pour les webhooks
WebhookModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
WebhookModel.belongsTo(UserModel, { as: "createdBy", foreignKey: "createdById" })
NotificationModel.belongsTo(WebhookModel, { foreignKey: "webhookId" })

// Relations pour les opportunités
OpportunityModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
OpportunityModel.belongsTo(StatusModel, { foreignKey: "statusId" })
OpportunityModel.belongsTo(ContactModel, { foreignKey: "contactId" })
OpportunityModel.belongsTo(CompanyModel, { foreignKey: "companyId" })
OpportunityModel.belongsTo(UserModel, { as: "assignedTo", foreignKey: "assignedToId" })
OpportunityModel.hasMany(QuoteModel, { foreignKey: "opportunityId" })

// Relations pour les devis
QuoteModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
QuoteModel.belongsTo(OpportunityModel, { foreignKey: "opportunityId" })
QuoteModel.belongsTo(ContactModel, { foreignKey: "contactId" })
QuoteModel.belongsTo(CompanyModel, { foreignKey: "companyId" })
QuoteModel.belongsTo(UserModel, { as: "assignedTo", foreignKey: "assignedToId" })
QuoteModel.hasMany(QuoteItemModel, { foreignKey: "quoteId", onDelete: "CASCADE" })

// Relations pour les éléments de devis
QuoteItemModel.belongsTo(QuoteModel, { foreignKey: "quoteId", onDelete: "CASCADE" })
QuoteItemModel.belongsTo(ProductModel, { foreignKey: "productId" })

// Relations pour les produits/services
ProductModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
ProductModel.belongsTo(UserModel, { as: "createdBy", foreignKey: "createdById" })
ProductModel.hasMany(QuoteItemModel, { foreignKey: "productId" })
ProductModel.hasMany(PurchaseOrderItemModel, { foreignKey: "productId" })

// Relations pour l'historique des devis
QuoteHistoryModel.belongsTo(QuoteModel, { foreignKey: "quoteId" })
QuoteHistoryModel.belongsTo(UserModel, { foreignKey: "userId" })

// Relations pour les conditions générales de vente
TermsAndConditionsModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
TermsAndConditionsModel.hasMany(QuoteModel, { foreignKey: "termsAndConditionsId" })
TermsAndConditionsModel.hasMany(PurchaseOrderModel, {
  foreignKey: "termsAndConditionsId",
})

// Relations pour les bons de commande
PurchaseOrderModel.belongsTo(TenantModel, { foreignKey: "tenantId" })
PurchaseOrderModel.belongsTo(QuoteModel, { foreignKey: "quoteId" })
PurchaseOrderModel.belongsTo(CompanyModel, { foreignKey: "companyId" })
PurchaseOrderModel.belongsTo(ContactModel, { foreignKey: "contactId" })
PurchaseOrderModel.belongsTo(UserModel, { as: "assignedTo", foreignKey: "assignedToId" })
PurchaseOrderModel.belongsTo(TermsAndConditionsModel, {
  foreignKey: "termsAndConditionsId",
})
PurchaseOrderModel.hasMany(PurchaseOrderItemModel, {
  foreignKey: "purchaseOrderId",
  onDelete: "CASCADE",
})

// Relations pour les éléments de bons de commande
PurchaseOrderItemModel.belongsTo(PurchaseOrderModel, {
  foreignKey: "purchaseOrderId",
  onDelete: "CASCADE",
})
PurchaseOrderItemModel.belongsTo(QuoteItemModel, { foreignKey: "quoteItemId" })
PurchaseOrderItemModel.belongsTo(ProductModel, { foreignKey: "productId" })

// Relations pour les devis
QuoteModel.hasMany(PurchaseOrderModel, { foreignKey: "quoteId" })

// Export des modèles
export {
  Activity,
  Company,
  CompanySpeciality,
  Contact,
  ContactSegment,
  ExternalIntegration,
  Note,
  Notification,
  NotificationTemplate,
  Opportunity,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  Quote,
  QuoteHistory,
  QuoteItem,
  Reminder,
  Role,
  Segment,
  sequelize,
  Speciality,
  Status,
  Tenant,
  TermsAndConditions,
  User,
  UserIntegration,
  Webhook,
  Workflow,
  WorkflowAction,
  WorkflowExecution,
  WorkflowTrigger,
}
