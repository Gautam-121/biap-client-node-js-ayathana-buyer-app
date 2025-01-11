import PhonePeService from "./phonePe.service.js"
import BadRequestParameterError from "../lib/errors/bad-request-parameter.error.js";
import {validationResult} from "express-validator"

const phonePeService = new PhonePeService()

class PaymentController {
    
    initializePayments(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }

        const { orderTransactionId } = req.params;
        const currentUser = req.user;
        const data = req.body;

        phonePeService
            .createPayments(orderTransactionId, data, currentUser)
            .then(response => {
                res.status(200).json(response);
            })
            .catch(err => next(err));
    } 
        

    phonePeInitiatePaymentWebhook(req,res,next) {
        // Get data from headers and request body
         const { 'x-verify': signature } = req.headers;
         const { response } = req.body;

        if(!response){
            throw new BadRequestParameterError('Invalid response data');
        }

        if(!signature){
            throw new BadRequestParameterError('Missing xVerify signature');
        }

        phonePeService.handleInitializePaymentWebhook(signature,response).then(user => {
            res.status(200).json(user);
        })
        .catch(err => next(err));
    }

    paymentStatus(req,res,next){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }

        const { merchantTransactionId } = req.params;
        const currentUser = req.user;
        const confirmdata = req.body.confirmRequest;

        phonePeService
            .paymentStatus(merchantTransactionId , confirmdata, currentUser)
            .then(response => {
                res.json(response);
            })
            .catch(err => next(err));
    }

    phonePeRefundWebhook(req,res,next) {
        // Get data from headers and request body
         const { 'x-verify': signature } = req.headers;
         const { response } = req.body;

        if(!response){
            throw new BadRequestParameterError('Invalid response data');
        }

        if(!signature){
            throw new BadRequestParameterError('Missing xVerify signature');
        }

        phonePeService.handleRefundWebhook(signature,response).then(user => {
            res.status(200).json(user);
        })
        .catch(err => next(err));
    }
    
}

export default PaymentController