import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
// Import Routes
import userRoutes from './routes/user.route.js';
import authRoutes from './routes/auth.route.js';

import studentRoutes from "./routes/student.routes.js";
import examinerRoutes from "./routes/examiner.routes.js";
import venueRoutes from "./routes/venue.routes.js";
import presentationRoutes from "./routes/presentation.routes.js";
import studentGroupRoutes from "./routes/groups.routes.js";
import modules from "./routes/module.routes.js";
import timetableRoutes from "./routes/timetable.routes.js";
import resceduleTImeTable from "./routes/lecRescedule.route.js";

// Load environment variables
dotenv.config();


// Initialize the Express app
const app = express();

// Middleware
app.use(express.json());  // Parses incoming requests with JSON payloads
app.use(cookieParser());   // Parse cookies in incoming requests

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,  // Allow requests from your frontend domain
  credentials: true,                // Allow credentials like cookies, headers
}));

// MongoDB connection using Mongoose directly
mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Exit the process if MongoDB connection fails
});

// Routes
app.use("/api/user", userRoutes);   // User management routes
app.use("/api/auth", authRoutes);   // Authentication routes

app.use("/api/students", studentRoutes);
app.use("/api/examiners", examinerRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/presentations", presentationRoutes);
app.use("/api/groups", studentGroupRoutes);
app.use("/api/modules", modules);
app.use("/api/timetables", timetableRoutes);
app.use("/api/reschedule", resceduleTImeTable);

const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, '/client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client','dist','index.html'));
});

// Global error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  return res.status(statusCode).json({
    success: false,
    message,
    statusCode,
  });
});

// Start the server
const PORT = process.env.PORT || 3000; // Use PORT from .env or default to 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
