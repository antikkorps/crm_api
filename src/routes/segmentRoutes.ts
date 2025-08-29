import Router from "koa-router"
import {
  addContactsToSegment,
  addContactToSegment,
  createSegment,
  deleteSegment,
  evaluateSegment,
  exportSegmentContacts,
  getAllSegments,
  getSegmentById,
  getSegmentContacts,
  getSegmentStats,
  previewSegmentRules,
  removeContactFromSegment,
  updateSegment,
} from "../controllers/segmentController"
import { checkPermission } from "../middlewares/roleMiddleware"

const router = new Router({ prefix: "/api/segments" })
// Route pour les statistiques
router.get("/stats", checkPermission("segments", "read"), getSegmentStats)
// Route pour prévisualiser les règles de segment
router.post("/preview", checkPermission("segments", "read"), previewSegmentRules)

// Routes principales pour les segments
router.get("/", checkPermission("segments", "read"), getAllSegments)
router.get("/:id", checkPermission("segments", "read"), getSegmentById)
router.get("/:id/contacts", checkPermission("segments", "read"), getSegmentContacts)
router.get("/:id/export", checkPermission("segments", "read"), exportSegmentContacts)
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
router.post(
  "/:segmentId/contacts",
  checkPermission("segments", "update"),
  addContactsToSegment
)
router.delete(
  "/:segmentId/contacts/:contactId",
  checkPermission("segments", "update"),
  removeContactFromSegment
)

export default router
