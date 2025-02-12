import { Router } from 'express';
import PhonePeController from './phonePe.controller.js';
import { authentication } from '../middlewares/index.js';
import paymentConfirmValidator from "./phonePe.confirm_order.validator.js"

const router = new Router();

const phonePeController = new PhonePeController();

router.post('/v2/phonepe/webhook', phonePeController.phonePeInitiatePaymentWebhook);

router.post('/v2/phonepe/:orderTransactionId',
    authentication(),
    paymentConfirmValidator.initializePayment,
    phonePeController.initializePaymentsForMultiSeller
);

router.post('/v2/phonepe/paymenStatus/:merchantTransactionId',
    authentication(),
    paymentConfirmValidator.confirm_payment,
    phonePeController.paymentStatus
);

router.post('/v2/phonepe/refund-webhook' , phonePeController.phonePeRefundWebhook)



export default router;