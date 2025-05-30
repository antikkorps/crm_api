import Router from "koa-router"
import {
  addContactToSegment,
  createSegment,
  deleteSegment,
  evaluateSegment,
  getAllSegments,
  getSegmentById,
  getSegmentContacts,
  removeContactFromSegment,
  updateSegment,
} from "../controllers/segmentController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/segments" })

// Routes principales pour les segments
router.get("/", checkPermission("segments", "read"), getAllSegments)
router.get("/:id", checkPermission("segments", "read"), getSegmentById)
router.get("/:id/contacts", checkPermission("segments", "read"), getSegmentContacts)
router.post("/", checkPermission("segments", "create"), createSegment)
router.put("/:id", checkPermission("segments", "update"), updateSegment)
router.delete("/:id", checkPermission("segments", "delete"), deleteSegment)

// Routes spéciales
router.post("/:id/evaluate", checkPermission("segments", "update"), evaluateSegment)
router.post(
  "/:segmentId/contacts/:contactId",
  checkPermission("segments", "update"),
  addContactToSegment
)
router.delete(
  "/:segmentId/contacts/:contactId",
  checkPermission("segments", "update"),
  removeContactFromSegment
)

export default router
