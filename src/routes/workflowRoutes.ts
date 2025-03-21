import Router from "koa-router"
import {
  createWorkflow,
  deleteWorkflow,
  executeWorkflowManually,
  getAllWorkflows,
  getWorkflowById,
  getWorkflowExecution,
  getWorkflowExecutions,
  toggleWorkflowStatus,
  updateWorkflow,
  updateWorkflowActions,
  updateWorkflowTriggers,
} from "../controllers/workflowController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/workflows" })

// Routes principales
router.get("/", checkPermission("workflows", "read"), getAllWorkflows)
router.get("/:id", checkPermission("workflows", "read"), getWorkflowById)
router.post("/", checkPermission("workflows", "create"), createWorkflow)
router.put("/:id", checkPermission("workflows", "update"), updateWorkflow)
router.delete("/:id", checkPermission("workflows", "delete"), deleteWorkflow)

// Routes spécialisées
router.put(
  "/:id/triggers",
  checkPermission("workflows", "update"),
  updateWorkflowTriggers
)
router.put("/:id/actions", checkPermission("workflows", "update"), updateWorkflowActions)
router.post("/:id/toggle", checkPermission("workflows", "update"), toggleWorkflowStatus)
router.post(
  "/:id/execute",
  checkPermission("workflows", "execute"),
  executeWorkflowManually
)

// Routes pour les exécutions
router.get("/:id/executions", checkPermission("workflows", "read"), getWorkflowExecutions)
router.get(
  "/executions/:executionId",
  checkPermission("workflows", "read"),
  getWorkflowExecution
)

export default router
