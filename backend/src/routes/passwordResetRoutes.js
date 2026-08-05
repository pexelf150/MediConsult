import express from 'express';
import * as passwordResetController from '../controllers/passwordResetController.js';

const router = express.Router();

router.post('/request', passwordResetController.requestReset);
router.post('/verify', passwordResetController.verifyCode);
router.post('/reset', passwordResetController.resetPassword);

export default router;
