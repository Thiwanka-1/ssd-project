import Venue from "../models/venue.model.js";

export const addVenue = async (req, res) => {
  try {
    const { location, capacity } = req.body;

    // Get the latest venue with a valid numeric venue_id
    const lastVenue = await Venue.findOne().sort({ created_at: -1 });

    let nextIdNumber = 1000; // Default starting ID

    if (lastVenue && lastVenue.venue_id) {
      const lastIdNumber = parseInt(lastVenue.venue_id.replace(/\D/g, ""), 10);
      nextIdNumber = lastIdNumber + 1;
    }

    const venue_id = `VEN${String(nextIdNumber).padStart(4, "0")}`;

    // Create and save new Venue
    const newVenue = new Venue({ venue_id, location, capacity });
    await newVenue.save();

    res.status(201).json({ message: "Venue added successfully", venue_id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


export const getAllVenues = async (req, res, next) => {
  try {
    const venues = await Venue.find();
    res.status(200).json(venues);
  } catch (error) {
    next(error);
  }
};

// Get venue by ID
export const getVenueById = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: "Venue not found" });

    res.status(200).json(venue);
  } catch (error) {
    next(error);
  }
};

export const updateVenue = async (req, res) => {
  try{
    const { id } = req.params;
    const updatedVenue = await Venue.findByIdAndUpdate(id, req.body, { new: true });

    if(!updatedVenue){
      return res.status(404).json({ message: "Venue not found" });
    }

    res.status(200).json(updatedVenue);
  }catch(error){
    res.status(500).json({ message: "Server error", error });
  }
};  

export const deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedVenue = await Venue.findByIdAndDelete(id);

    if (!deletedVenue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    res.status(200).json({ message: "Venue deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};