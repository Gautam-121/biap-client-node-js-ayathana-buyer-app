import UpdateOrderService from './updateOrder.service.js';
import BadRequestParameterError from '../../../lib/errors/bad-request-parameter.error.js';
import { validationResult } from "express-validator"
import { RETURN_REASONS } from "../../../utils/cancellation-return-reason.js"; 


const cancelOrderService = new UpdateOrderService();

class UpdateOrderController {
    /**
    * cancel order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    async update(req, res, next) {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        
        const {body: orders,user} = req;

        // console.log("orderStatus-------------------->",orders)
        const onUpdateOrderResponse = await Promise.all(
            orders.map(async order => {
                try {
                    console.log("update orders--------------->",order);
                    return await cancelOrderService.update(order,user);
                } catch (err) {

                    console.log("update orders---------err------>",err);

                    return err.response.data;
                    // throw err;
                }
            })
        );

        res.json(onUpdateOrderResponse);

        // return onUpdateOrderResponse;
    }


    /**
    * on cancel order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onUpdate(req, res, next) {
        const { query } = req;
        const { messageId } = query;
        
        if(messageId) {
            cancelOrderService.onUpdate(messageId).then(order => {
                res.json(order);
            }).catch((err) => {
                next(err);
            });
        }
        else
            throw new BadRequestParameterError();

    }

    getReturn_reasons(req , res , next){
        try {
            res.json({
                success: true,
                message: "Return reasons send successfully",
                data: RETURN_REASONS
            });
        } catch (error) {
            console.log(error);
            return res.status(400).send(error)
        }
    }

}

export default UpdateOrderController;
