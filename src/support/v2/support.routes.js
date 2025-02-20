import { Router } from 'express';
import { authentication } from '../../middlewares/index.js';

import SupportController from './support.controller.js';
import supportValidator from './support.validator.js';

const router = new Router();
const supportController = new SupportController();

// support v1
router.post(
    '/v1/get_support',
    supportController.support,
);
// support v2
router.post(
    '/v2/get_support/:orderId', 
    authentication(),
    supportValidator.support,
    supportController.supportMultipleOrder,
);

// on support v1
router.get('/v1/on_support', supportController.onSupport);
// on support v2
router.get('/v2/on_support', authentication(), supportValidator.on_support,  supportController.onSupportMultipleOrder);

export default router;
