import SelectOrderService from './selectOrder.service.js';
import BadRequestParameterError from '../../../lib/errors/bad-request-parameter.error.js';
import {validationResult} from "express-validator";
import checkPhoneVerificationStatus from '../../../utils/phoneVerification.js';
import UnauthenticatedError from '../../../lib/errors/unauthenticated.error.js';

const selectOrderService = new SelectOrderService();

class SelectOrderController {

    /**
    * select order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    selectOrder(req, res, next) {
        const { body: request } = req;

        selectOrderService.selectOrder(request).then(response => {
            res.json({ ...response });
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * select multiple orders
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    async selectMultipleOrder(req, res, next) {
        try {
            const { body: requests } = req;
    
            const verificationStatus = await checkPhoneVerificationStatus(req.user.decodedToken.uid);
    
            if (verificationStatus.requiresPhoneVerification) {
                return next(new UnauthenticatedError(`Please verify your phone number before proceeding with the transaction`));
            }
    
            // Validate requests array
            if (!Array.isArray(requests) || requests.length === 0) {
                return next(new BadRequestParameterError("Invalid or empty requests array"));
            }
    
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new BadRequestParameterError(errors.array()[0].msg));
            }
    
            if (requests && requests.length) {
                selectOrderService.selectMultipleOrder(requests)
                    .then(response => res.json(response))
                    .catch(err => next(err)); // ✅ Pass error to next() instead of throwing
            }
    
        } catch (error) {
            next(error); // ✅ Ensure all errors are passed to Express error handling middleware
        }
    }
    

    /**
    * on select order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onSelectOrder(req, res, next) {
        const { query } = req;
        const { messageId } = query;
        
        selectOrderService.onSelectOrder(messageId).then(order => {
            res.json(order);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on select multiple order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onSelectMultipleOrder(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        
        const { query } = req;
        const { messageIds } = query;
        
        if(messageIds && messageIds.length && messageIds.trim().length) { 
            const messageIdArray = messageIds.split(",");
            selectOrderService.onSelectMultipleOrder(messageIdArray).then(orders => {
                res.json(orders);
            }).catch((err) => {
                next(err);
            });
        }
        else
            throw new BadRequestParameterError();
    }
}

export default SelectOrderController;
