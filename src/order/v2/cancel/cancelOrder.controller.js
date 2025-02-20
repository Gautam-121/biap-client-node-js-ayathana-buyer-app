import CancelOrderService from './cancelOrder.service.js';
import BadRequestParameterError from '../../../lib/errors/bad-request-parameter.error.js';
import { CANCELATION_REASONS } from "../../../utils/cancellation-return-reason.js"; 
import { validationResult } from 'express-validator';

const cancelOrderService = new CancelOrderService();

class CancelOrderController {
    /**
    * cancel order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    cancelOrder(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        
        const orderRequest = req.body;
        const user = req.user

        cancelOrderService.cancelOrder(orderRequest,user).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }


    /**
    * on cancel order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onCancelOrder(req, res, next) {
        const { query } = req;
        const { messageId } = query;
        
        if(messageId) {
            cancelOrderService.onCancelOrder(messageId).then(order => {
                res.json(order);
            }).catch((err) => {
                next(err);
            });
        }
        else
            throw new BadRequestParameterError();

    }

    getCancellation_reasons(req , res , next){
        try {
            res.json({
                success: true,
                message: "Cancel reasons send successfully",
                data: CANCELATION_REASONS
            });
        } catch (error) {
        console.log(error);
        return res.status(400).send(error)
      }
    }

}

export default CancelOrderController;
