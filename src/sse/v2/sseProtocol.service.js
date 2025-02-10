import { PROTOCOL_CONTEXT } from '../../utils/constants.js';
import { sendSSEResponse } from '../../utils/sse.js';

import OrderStatusService from "../../order/v2/status/orderStatus.service.js";
import UpdateOrderService from "../../order/v2/update/updateOrder.service.js";
import CancelOrderService from "../../order/v2/cancel/cancelOrder.service.js";
const orderStatusService = new OrderStatusService();
const updateOrderService = new UpdateOrderService();
const cancelOrderService = new CancelOrderService();

class SseProtocol {

    /**
    * on cancel
    * @param {Object} response 
    */
    async onCancel(response) {
        try {
            const { messageId } = response;

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_CANCEL,
                response,
            );

            await cancelOrderService.onCancelOrderDbOperation(messageId);

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            throw err;
        }
    }

    /**
     * on confirm
     * @param {Object} response 
     */
    async onConfirm(response) {
        try {
            const { messageId } = response;

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_CONFIRM,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * on init
    * @param {Object} response 
    */
    async onInit(response) {
        try {
            const { messageId } = response;
            console.log(`[DEBUG] onInit---${messageId}--${response}`)
            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_INIT,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            throw err;
        }
    }


     /**
    * on info
    * @param {Object} response 
    */
     async onInfo(response) {
        try {
            const { messageId } = response;


            console.log(`[DEBUG] onInit---${messageId}--${response}`)
            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_INFO,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            throw err;
        }
    }


    async info(response) {
        try {
            const { messageId } = response;


            console.log(`[DEBUG] onInit---${messageId}--${response}`)
            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.INFO,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * on search
    * @param {Object} response 
    */
    async onSearch(response) {
        try {
            const { messageId } = response;

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_SEARCH,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * on quote
    * @param {Object} response 
    */
    async onQuote(response) {
        try {
            const { messageId } = response;
    
            console.log(`[onQuote] Entered the onQuote method with messageId: ${messageId}`);
            
            // Log the time before sending the SSE response
            const startSSETime = Date.now();
            console.log(`[onQuote] Sending SSE response for messageId: ${messageId}...`);
            
            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_SELECT,
                response,
            );
    
            const sendSSETime = Date.now() - startSSETime;
            console.log(`[onQuote] Time taken to send SSE response: ${sendSSETime}ms`);
    
            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            console.error(`[onQuote] Error in onQuote method:`, err);
            throw err;
        }
    }

    /**
    * on status
    * @param {Object} response 
    */
    async onStatus(response) {
        try {
            const { messageId } = response;

            console.log("messageId--->",messageId)
            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_STATUS,
                response,
            );

            await orderStatusService.onOrderStatusV2([messageId]);

            console.log("Enter after orderStatusService.onOrderStatusV2")

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * on support
    * @param {Object} response 
    */
    async onSupport(response) {
        try {
            const { messageId } = response;

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_SUPPORT,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * on track
    * @param {Object} response 
    */
    async onTrack(response) {
        try {
            const { messageId } = response;

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_TRACK,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * on update
    * @param {Object} response
    */
    async onUpdate(response) {
        try {
            const { messageId } = response;

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_UPDATE,
                response,
            );

            await updateOrderService.onUpdateDbOperation(messageId);

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            throw err;
        }
    }
};

export default SseProtocol;