import express from 'express';
import * as zoomController from '../controllers/zoomController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/signature', protect, zoomController.generateSDKSignature);

export default router;
