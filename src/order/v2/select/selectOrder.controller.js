import SelectOrderService from './selectOrder.service.js';
import BadRequestParameterError from '../../../lib/errors/bad-request-parameter.error.js';
import {validationResult} from "express-validator";

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
    selectMultipleOrder(req, res, next) {
        const { body: requests } = req;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = [
                {
                    status: 400,
                    error: {
                        name: "BAD_REQUEST_PARAMETER_ERROR",
                        message: errors.array()[0].msg
                    }
                }
            ]
            return res.status(400).json(error)
        }

        if (requests && requests.length) {

            selectOrderService.selectMultipleOrder(requests).then(response => {
                res.json(response);
            }).catch((err) => {
                next(err);
            });

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
            const error = [
                {
                    status: 400,
                    error: {
                        name: "BAD_REQUEST_PARAMETER_ERROR",
                        message: errors.array()[0].msg
                    }
                }
            ]
            return res.status(400).json(error)
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
