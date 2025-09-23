import express from "express";
import { 
    addVenue,
    getAllVenues,
    getVenueById,
    updateVenue,
    deleteVenue,

} from "../controllers/venue.controller.js";

const router = express.Router();

// Route to add a venue
router.post("/add", addVenue);

router.get("/get-ven", getAllVenues);

router.get("/get-ven/:id", getVenueById);

router.put("/update-ven/:id", updateVenue);

router.delete("/delete-ven/:id", deleteVenue);

export default router;
