import { Router } from 'express';
import * as currencyController from '../controllers/currencyController.js';

const router = Router();

router.get('/rate', currencyController.getExchangeRate);
router.get('/convert', currencyController.convertAmount);

export default router;
