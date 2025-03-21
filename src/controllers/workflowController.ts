import { Context } from "koa"
import {
  User,
  Workflow,
  WorkflowAction,
  WorkflowExecution,
  WorkflowTrigger,
} from "../models"
import { ActionType } from "../models/workflowAction"
import { ExecutionStatus } from "../models/workflowExecution"
import { TriggerType } from "../models/workflowTrigger"
import { workflowEngine } from "../services/workflowEngine"
import { BadRequestError, NotFoundError } from "../utils/errors"
import { paginatedQuery } from "../utils/pagination"

/**
 * Récupère tous les workflows d'un tenant
 */
export const getAllWorkflows = async (ctx: Context) => {
  try {
    const result = await paginatedQuery(Workflow, ctx, {
      where: { tenantId: ctx.state.user.tenantId },
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: WorkflowTrigger },
      ],
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère un workflow par son ID
 */
export const getWorkflowById = async (ctx: Context) => {
  try {
    const workflow = await Workflow.findByPk(ctx.params.id, {
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: WorkflowTrigger },
        {
          model: WorkflowAction,
          order: [["order", "ASC"]],
        },
      ],
    })

    if (!workflow) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès au workflow (même tenant)
    if (workflow.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    ctx.body = workflow
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère les exécutions d'un workflow
 */
export const getWorkflowExecutions = async (ctx: Context) => {
  try {
    const workflow = await Workflow.findByPk(ctx.params.id)

    if (!workflow) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès au workflow (même tenant)
    if (workflow.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    const result = await paginatedQuery(WorkflowExecution, ctx, {
      where: {
        workflowId: ctx.params.id,
        tenantId: ctx.state.user.tenantId,
      },
      order: [["createdAt", "DESC"]],
    })

    ctx.body = result
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Crée un nouveau workflow
 */
export const createWorkflow = async (ctx: Context) => {
  try {
    const { name, description, isActive, triggers, actions } = (ctx.request as any).body

    if (!name) {
      throw new BadRequestError("Workflow name is required")
    }

    if (!triggers || !Array.isArray(triggers) || triggers.length === 0) {
      throw new BadRequestError("At least one trigger is required")
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      throw new BadRequestError("At least one action is required")
    }

    // Créer le workflow
    const workflow = await Workflow.create({
      name,
      description,
      isActive: isActive !== undefined ? isActive : true,
      tenantId: ctx.state.user.tenantId,
      createdById: ctx.state.user.id,
    })

    // Créer les triggers
    const createdTriggers = await Promise.all(
      triggers.map((trigger: any) => {
        const { triggerType, conditions } = trigger

        // Vérifier que le type de trigger est valide
        if (!Object.values(TriggerType).includes(triggerType)) {
          throw new BadRequestError(`Invalid trigger type: ${triggerType}`)
        }

        return WorkflowTrigger.create({
          workflowId: workflow.get("id"),
          triggerType,
          conditions,
        })
      })
    )

    // Créer les actions
    const createdActions = await Promise.all(
      actions.map((action: any, index: number) => {
        const { actionType, params, executeCondition } = action

        // Vérifier que le type d'action est valide
        if (!Object.values(ActionType).includes(actionType)) {
          throw new BadRequestError(`Invalid action type: ${actionType}`)
        }

        // Vérifier que les paramètres sont présents
        if (!params) {
          throw new BadRequestError(`Parameters are required for action ${actionType}`)
        }

        return WorkflowAction.create({
          workflowId: workflow.get("id"),
          actionType,
          order: index,
          params,
          executeCondition,
        })
      })
    )

    // Récupérer le workflow complet avec ses relations
    const createdWorkflow = await Workflow.findByPk((workflow as any).id, {
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: WorkflowTrigger },
        { model: WorkflowAction, order: [["order", "ASC"]] },
      ],
    })

    ctx.status = 201
    ctx.body = createdWorkflow
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Met à jour un workflow existant
 */
export const updateWorkflow = async (ctx: Context) => {
  try {
    const workflow = await Workflow.findByPk(ctx.params.id)

    if (!workflow) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès au workflow (même tenant)
    if (workflow.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    const { name, description, isActive } = (ctx.request as any).body

    // Mettre à jour les propriétés de base du workflow
    await workflow.update({
      name: name !== undefined ? name : workflow.get("name"),
      description: description !== undefined ? description : workflow.get("description"),
      isActive: isActive !== undefined ? isActive : workflow.get("isActive"),
    })

    // Récupérer le workflow mis à jour
    const updatedWorkflow = await Workflow.findByPk((workflow as any).id, {
      include: [
        { model: User, as: "createdBy", attributes: { exclude: ["password"] } },
        { model: WorkflowTrigger },
        { model: WorkflowAction, order: [["order", "ASC"]] },
      ],
    })

    ctx.body = updatedWorkflow
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Met à jour les triggers d'un workflow
 */
export const updateWorkflowTriggers = async (ctx: Context) => {
  try {
    const workflow = await Workflow.findByPk(ctx.params.id)

    if (!workflow) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès au workflow (même tenant)
    if (workflow.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    const { triggers } = (ctx.request as any).body

    if (!triggers || !Array.isArray(triggers)) {
      throw new BadRequestError("Triggers must be an array")
    }

    // Supprimer les triggers existants
    await WorkflowTrigger.destroy({
      where: { workflowId: workflow.get("id") },
    })

    // Créer les nouveaux triggers
    await Promise.all(
      triggers.map((trigger: any) => {
        const { triggerType, conditions } = trigger

        // Vérifier que le type de trigger est valide
        if (!Object.values(TriggerType).includes(triggerType)) {
          throw new BadRequestError(`Invalid trigger type: ${triggerType}`)
        }

        return WorkflowTrigger.create({
          workflowId: workflow.get("id"),
          triggerType,
          conditions,
        })
      })
    )

    // Récupérer le workflow mis à jour
    const updatedWorkflow = await Workflow.findByPk((workflow as any).id, {
      include: [
        { model: WorkflowTrigger },
        { model: WorkflowAction, order: [["order", "ASC"]] },
      ],
    })

    ctx.body = updatedWorkflow
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Met à jour les actions d'un workflow
 */
export const updateWorkflowActions = async (ctx: Context) => {
  try {
    const workflow = await Workflow.findByPk(ctx.params.id)

    if (!workflow) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès au workflow (même tenant)
    if (workflow.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    const { actions } = (ctx.request as any).body

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      throw new BadRequestError("At least one action is required")
    }

    // Supprimer les actions existantes
    await WorkflowAction.destroy({
      where: { workflowId: workflow.get("id") },
    })

    // Créer les nouvelles actions
    await Promise.all(
      actions.map((action: any, index: number) => {
        const { actionType, params, executeCondition } = action

        // Vérifier que le type d'action est valide
        if (!Object.values(ActionType).includes(actionType)) {
          throw new BadRequestError(`Invalid action type: ${actionType}`)
        }

        return WorkflowAction.create({
          workflowId: workflow.get("id"),
          actionType,
          order: index,
          params,
          executeCondition,
        })
      })
    )

    // Récupérer le workflow mis à jour
    const updatedWorkflow = await Workflow.findByPk((workflow as any).id, {
      include: [
        { model: WorkflowTrigger },
        { model: WorkflowAction, order: [["order", "ASC"]] },
      ],
    })

    ctx.body = updatedWorkflow
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Supprime un workflow
 */
export const deleteWorkflow = async (ctx: Context) => {
  try {
    const workflow = await Workflow.findByPk(ctx.params.id)

    if (!workflow) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès au workflow (même tenant)
    if (workflow.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    // Supprimer les triggers et actions associés (cascade delete n'est pas automatique avec Sequelize)
    await WorkflowTrigger.destroy({
      where: { workflowId: workflow.get("id") },
    })

    await WorkflowAction.destroy({
      where: { workflowId: workflow.get("id") },
    })

    // Supprimer les exécutions
    await WorkflowExecution.destroy({
      where: { workflowId: workflow.get("id") },
    })

    // Supprimer le workflow
    await workflow.destroy()

    ctx.status = 204
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Active ou désactive un workflow
 */
export const toggleWorkflowStatus = async (ctx: Context) => {
  try {
    const workflow = await Workflow.findByPk(ctx.params.id)

    if (!workflow) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès au workflow (même tenant)
    if (workflow.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    // Inverser l'état actif
    const newStatus = !(workflow.get("isActive") as boolean)

    await workflow.update({
      isActive: newStatus,
    })

    ctx.body = {
      id: workflow.get("id"),
      name: workflow.get("name"),
      isActive: newStatus,
    }
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Lance manuellement une exécution de workflow
 */
export const executeWorkflowManually = async (ctx: Context) => {
  try {
    const workflow = await Workflow.findByPk(ctx.params.id, {
      include: [{ model: WorkflowTrigger }],
    })

    if (!workflow) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    // Vérifier que l'utilisateur a accès au workflow (même tenant)
    if (workflow.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Workflow with ID ${ctx.params.id} not found`)
    }

    const { entityType, entityId } = (ctx.request as any).body

    if (!entityType || !entityId) {
      throw new BadRequestError("Entity type and ID are required")
    }

    // Vérifier qu'il y a au moins un trigger
    const triggers = workflow.get("WorkflowTriggers") as any[]
    if (!triggers || triggers.length === 0) {
      throw new BadRequestError("Workflow has no triggers")
    }

    // Créer une exécution manuelle
    const execution = await WorkflowExecution.create({
      workflowId: workflow.get("id"),
      triggerId: triggers[0].id, // Utiliser le premier trigger
      entityType,
      entityId,
      status: ExecutionStatus.PENDING,
      context: {
        tenantId: ctx.state.user.tenantId,
        entityId,
        entityType,
        userId: ctx.state.user.id,
        timestamp: new Date(),
        isManualExecution: true,
        data: {
          // Inclure d'autres données si nécessaire
        },
      },
      tenantId: ctx.state.user.tenantId,
    })

    // Exécuter le workflow de façon asynchrone
    workflowEngine
      .executeWorkflow(execution.get("id") as string)
      .catch((error) => console.error(`Error executing workflow: ${error.message}`))

    ctx.status = 202 // Accepted
    ctx.body = {
      message: "Workflow execution started",
      executionId: execution.get("id"),
    }
  } catch (error: unknown) {
    throw error
  }
}

/**
 * Récupère une exécution de workflow spécifique
 */
export const getWorkflowExecution = async (ctx: Context) => {
  try {
    const execution = await WorkflowExecution.findByPk(ctx.params.executionId, {
      include: [{ model: Workflow }],
    })

    if (!execution) {
      throw new NotFoundError(`Execution with ID ${ctx.params.executionId} not found`)
    }

    // Vérifier que l'utilisateur a accès à l'exécution (même tenant)
    if (execution.get("tenantId") !== ctx.state.user.tenantId) {
      throw new NotFoundError(`Execution with ID ${ctx.params.executionId} not found`)
    }

    ctx.body = execution
  } catch (error: unknown) {
    throw error
  }
}
