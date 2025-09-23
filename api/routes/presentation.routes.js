import express from "express";
import { 
    addPresentation,
    getAllPresentations,
    getPresentationById,
    updatePresentation,
    deletePresentation,
    smartSuggestSlot,
    smartSuggestSlotForReschedule,
    requestReschedule,
    approveOrRejectReschedule,
    getAllRequests,
    deleteRescheduleRequest,
    checkAvailability,
    getPresentationsForExaminer,
    getPresentationsForStudent,
    getUserPresentations,
    getRescheduleRequestsForExaminer,
    deleteOldRejectedRequests,
    deleteAllApprovedRequestsForExaminer,
    deleteAllRejectedRequestsForExaminer,

} from "../controllers/presentation.controller.js";
import { verifyToken } from '../utils/verifyUser.js';

const router = express.Router();

router.post("/add", addPresentation);

router.get("/get-pres", getAllPresentations);

router.post("/smart-suggest-slot", smartSuggestSlot);

router.post("/smart-suggest-slot-req", smartSuggestSlotForReschedule);

router.post("/reschedule",verifyToken, requestReschedule);

router.post("/req-approve", approveOrRejectReschedule);

router.get("/get-requests", getAllRequests);

router.post("/check-availability", checkAvailability);

router.get("/ex-req", verifyToken, getRescheduleRequestsForExaminer);

router.delete("/delete-old-req", verifyToken, deleteOldRejectedRequests);

router.delete("/delete-accepted", verifyToken, deleteAllApprovedRequestsForExaminer);

router.delete("/delete-rejected", verifyToken, deleteAllRejectedRequestsForExaminer);


router.get("/user/:userId", verifyToken, getUserPresentations);

router.delete("/delete-req/:id", deleteRescheduleRequest);

router.get("/get-pres/:id", getPresentationById);

router.put("/update-pres/:id", updatePresentation);

router.delete("/delete-pres/:id", deletePresentation);

router.get("/examiner/:examinerId",verifyToken, getPresentationsForExaminer);

// Route to get presentations for students
router.get("/student/:studentId",verifyToken, getPresentationsForStudent);

export default router;
