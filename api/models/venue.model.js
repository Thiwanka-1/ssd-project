import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema(
  {
    venue_id: {
      type: String,
      required: true,
      unique: true
    },
    location: {
      type: String,
      required: true
    },
    capacity: {
      type: Number,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  }
);

const Venue = mongoose.model('Venue', venueSchema);

export default Venue;
