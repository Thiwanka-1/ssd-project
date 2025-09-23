import express from 'express';
import {getRescheduledLecturesForLecturer, rescheduleLectures  } from '../controllers/lecReschedule.controller.js';

const router = express.Router();

router.post('/do', rescheduleLectures);
router.get('/get/:lecturerId', getRescheduledLecturesForLecturer);

export default router;