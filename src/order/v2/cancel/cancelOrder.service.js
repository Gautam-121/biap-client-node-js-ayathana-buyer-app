import { onOrderCancel } from "../../../utils/protocolApis/index.js";
import { PROTOCOL_CONTEXT } from "../../../utils/constants.js";
import {
    addOrUpdateOrderWithTransactionId,
    addOrUpdateOrderWithTransactionIdAndProvider,
    addOrUpdateOrderWithTransactionIdAndOrderId,
    getOrderById
} from "../../v1/db/dbService.js";

import BppCancelService from "./bppCancel.service.js";
import PhonePeService from "../../../phonePe/phonePe.service.js";
import ContextFactory from "../../../factories/ContextFactory.js";
import CustomError from "../../../lib/errors/custom.error.js";
import NoRecordFoundError from "../../../lib/errors/no-record-found.error.js";
import OrderMongooseModel from '../../v1/db/order.js';
import RefundQueue from "../../../razorPay/db/refund.js";
import { CANCELATION_REASONS } from "../../../utils/cancellation-return-reason.js"; 
import Fulfillments from "../../v2/db/fulfillments.js";
import FulfillmentHistory from "../../v2/db/fulfillmentHistory.js";
import Settlements from "../../v2/db/settlement.js";
import Transaction from "../../../razorPay/db/transaction.js";
import PhonePeService from "../../../phonePe/phonePe.service.js";
import BadRequestParameterError from "../../../lib/errors/bad-request-parameter.error.js";


const bppCancelService = new BppCancelService();
const phonePeService = new PhonePeService()


class CancelOrderService {

    /**
    * cancel order
    * @param {Object} orderRequest
    */
    async cancelOrder(orderRequest,user) {
        try {


            console.log("cancel order-------------->",orderRequest);

            const orderDetails = await getOrderById(orderRequest.message.order_id);

            if(orderDetails[0].state === "Completed"){
                throw new BadRequestParameterError( `Order is in ${orderDetails[0].state} state and cannot be cancelled.`);
            }
            else if (orderDetails[0].state === 'Cancelled') {
                throw new BadRequestParameterError(`The order has already been cancelled and cannot be processed further.`);
            }

            const isCancellable = orderDetails[0].items.find(item => typeof item?.product?.["@ondc/org/cancellable"] === "boolean" && item.product["@ondc/org/cancellable"] === false);
            if(isCancellable){
                throw new BadRequestParameterError("One or more items in the order are not cancellable.");
            }

            const contextFactory = new ContextFactory();
            const context = contextFactory.create({
                action: PROTOCOL_CONTEXT.CANCEL,
                transactionId: orderDetails[0].transactionId,
                bppId: orderDetails[0]?.bppId,
                bpp_uri: orderDetails[0].bpp_uri,
                cityCode:orderDetails[0].city,
                city:orderDetails[0].city,
                domain:orderDetails[0].domain
            });

            let fulfillmentId =orderDetails[0].items[0].fulfillment_id;

            const { message = {} } = orderRequest || {};
            const { order_id, cancellation_reason_id } = message || {};

            if (!(context?.bpp_id)) {
                throw new CustomError("BPP Id is mandatory");
            }

            // Check if cancellation_reason_id is in CANCELATION_REASONS
            const validReason = CANCELATION_REASONS.some(reason => reason.key === cancellation_reason_id);

            if (!validReason) {
                throw new BadRequestParameterError("Invalid cancellation reason provided.");
            }

            return await bppCancelService.cancelOrder(
                context,
                order_id,
                cancellation_reason_id,
                fulfillmentId
            );
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * on cancel order
    * @param {Object} messageId
    */
    async onCancelOrder(messageId) {
        try {
            let protocolCancelResponse = await onOrderCancel(messageId);

            if (!(protocolCancelResponse && protocolCancelResponse.length)) {
                const contextFactory = new ContextFactory();
                const context = contextFactory.create({
                    messageId: messageId,
                    action: PROTOCOL_CONTEXT.ON_CANCEL
                });

                return {
                    context,
                    error: {
                        message: "No data found"
                    }
                };
            }
            else {
                if (!(protocolCancelResponse?.[0].error)) {

                    protocolCancelResponse = protocolCancelResponse?.[0];
                }
                return protocolCancelResponse;
            }
        }
        catch (err) {
            return err.response.data;
        }
    }

    async onCancelOrderDbOperation(messageId) {
        try {
            let protocolCancelResponse = await onOrderCancel(messageId);

            if (!(protocolCancelResponse && protocolCancelResponse.length)) {
                const contextFactory = new ContextFactory();
                const context = contextFactory.create({
                    messageId: messageId,
                    action: PROTOCOL_CONTEXT.ON_CANCEL
                });

                return {
                    context,
                    error: {
                        message: "No data found"
                    }
                };
            }
            else {
                if (!(protocolCancelResponse?.[0].error)) {

                    protocolCancelResponse = protocolCancelResponse?.[0];

                    console.log("protocolCancelResponse----------------->", protocolCancelResponse);

                    // message: { order: { id: '7488750', state: 'Cancelled', tags: [Object] } }
                    const dbResponse = await OrderMongooseModel.find({
                        transactionId: protocolCancelResponse.context.transaction_id, id: protocolCancelResponse.message.order.id
                    });

                    console.log("dbResponse----------------->", dbResponse);


                    if (!(dbResponse || dbResponse.length))
                        throw new NoRecordFoundError();
                    else {

                        const orderSchema = dbResponse?.[0].toJSON();
                        orderSchema.state = protocolCancelResponse?.message?.order?.state;

                        if (protocolCancelResponse?.message?.order?.quote) {
                            orderSchema.updatedQuote = protocolCancelResponse?.message?.order?.quote
                        }

                        // Handle fulfillments
                        let fulfillments = protocolCancelResponse?.message?.order?.fulfillments;

                        for (let fl of fulfillments) {
                            // Find if fulfillment exists
                            let dbFl = await Fulfillments.findOne({
                                orderId: protocolCancelResponse?.message?.order.id,
                                id: fl.id
                            });

                            if (!dbFl) {
                                // Save new fulfillment
                                let newFl = new Fulfillments();
                                newFl.id = fl.id;
                                newFl.orderId = protocolCancelResponse?.message?.order.id;
                                newFl.state = fl.state;
                                if (fl.type === 'RTO') {
                                    newFl.type = fl.type;
                                    newFl.tags = fl.tags;
                                } 
                                else if (fl.type === 'Cancel') {
                                    newFl.type = f1.type;
                                    newFl.tags = fl.tags;
                                }
                                else {
                                    newFl.type = 'orderFulfillment';
                                }
                                dbFl = await newFl.save();
                            } else {
                                dbFl.state = fl.state;
                                if (fl.type === 'RTO') {
                                    dbFl.tags = fl.tags;
                                }
                                else if(f1.type === "Cancel"){
                                    dbFl.tags = f1.tags
                                }
                                await dbFl.save();
                            }

                            // Create fulfillment history
                            let existingFulfillment = await FulfillmentHistory.findOne({
                                id: fl.id,
                                state: fl.state.descriptor.code
                            });

                            if (!existingFulfillment) {
                                await FulfillmentHistory.create({
                                    orderId: protocolCancelResponse?.message?.order.id,
                                    type: fl.type,
                                    id: fl.id,
                                    state: fl.state.descriptor.code,
                                    updatedAt: protocolCancelResponse?.message?.order?.updated_at?.toString()
                                });
                            }

                            // // Refund processing for both Normal Cancellation and RTO
                            let refundAmount = 0;
                            let isRefundRequired = false;

                            // Determine refund amount and necessity
                            if (fl.type === 'RTO' && fl.state?.descriptor?.code === 'RTO-Initiated') {
                                isRefundRequired = true;
                                let quoteTrails = fl.tags.filter(i => i.code === 'quote_trail');

                                for (let trail of quoteTrails) {
                                    let amount = trail?.list?.find(i => i.code === 'value')?.value ?? 0;
                                    refundAmount += Math.abs(parseFloat(amount))
                                }
                            }
                            // Add condition for normal cancellation
                            else if (fl.type === 'Cancel' && fl.state?.descriptor?.code === 'Cancelled' ) {
                                isRefundRequired = true;
                                // Calculate total refund from quote trail
                                let quoteTrails = fl.tags.filter(i => i.code === 'quote_trail');

                                for (let trail of quoteTrails) {
                                    let amount = trail?.list?.find(i => i.code === 'value')?.value ?? 0;
                                    refundAmount += Math.abs(parseFloat(amount))
                                }
                            }


                            // Process refund if required
                            if (isRefundRequired) {
                                // Check if settlement already exists
                                let oldSettlement = await Settlements.findOne({
                                    orderId: dbFl.orderId,
                                    fulfillmentId: dbFl.id
                                });

                                if (!oldSettlement) {
                                    // Refund processing
                                    let settlement_type = "upi";
                                    let txnDetails = await Transaction.findOne({
                                        transactionId: protocolCancelResponse.context.transaction_id
                                    });

                                    if (!txnDetails) {
                                        throw new NoRecordFoundError("Transaction Record Not Found");
                                    }

                                    if(txnDetails.amount < refundAmount){
                                        throw new BadRequestParameterError("Refund amound is gretaer than initial confirm amount")
                                    }

                                    settlement_type = txnDetails?.payment?.method ?? 'upi';
                                    let settlementContext = protocolCancelResponse.context;
                                    let settlementTimeStamp = new Date();

                                    // Construct update request
                                    let updateRequest = {
                                        "context": {
                                            "domain": settlementContext.domain,
                                            "action": "update",
                                            "core_version": "1.2.0",
                                            "bap_id": settlementContext.bap_id,
                                            "bap_uri": settlementContext.bap_uri,
                                            "bpp_id": settlementContext.bpp_id,
                                            "bpp_uri": settlementContext.bpp_uri,
                                            "transaction_id": settlementContext.transaction_id,
                                            "message_id": uuidv4(),
                                            "city": settlementContext.city,
                                            "country": settlementContext.country,
                                            "timestamp": settlementTimeStamp
                                        },
                                        "message": {
                                            "update_target": "payment",
                                            "order": {
                                                "id": dbFl.orderId,
                                                "fulfillments": [
                                                    {
                                                        "id": dbFl.id,
                                                        "type": dbFl.type
                                                    }
                                                ],
                                                "payment": {
                                                    "@ondc/org/settlement_details": [
                                                        {
                                                            "settlement_counterparty": "buyer",
                                                            "settlement_phase": "refund",
                                                            "settlement_type": settlement_type,
                                                            "settlement_amount": refundAmount,
                                                            "settlement_timestamp": settlementTimeStamp
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    };

                                    // Send update request
                                    await bppUpdateService.update(
                                        updateRequest.context,
                                        "payment",
                                        updateRequest.message
                                    );

                                    // Process refund
                                    await phonePeService.initiateRefund(
                                        txnDetails,
                                        Math.abs(refundAmount)
                                    );

                                    // Save settlement details
                                    let newSettlement = new Settlements();
                                    newSettlement.orderId = dbFl.orderId;
                                    newSettlement.fulfillmentId = dbFl.id;
                                    newSettlement.refundAmount = Math.abs(refundAmount);
                                    newSettlement.settlementType = settlement_type;
                                    await newSettlement.save();
                                }
                            }

                        }

                        // Update items
                        let updateItems = [];
                        for (let item of protocolCancelResponse.message.order.items) {
                            let fulfillmentStatus = await Fulfillments.findOne({
                                id: item.fulfillment_id,
                                orderId: protocolCancelResponse.message.order.id
                            });

                            let updatedItem = orderSchema.items.filter(element => element.id === item.id);
                            let temp = updatedItem[0];

                            if (fulfillmentStatus.type === 'RTO' || fulfillmentStatus.type === "Cancel") {
                                item.cancellation_status = fulfillmentStatus?.state?.descriptor?.code;
                            }
                            item.fulfillment_status = fulfillmentStatus?.state?.descriptor?.code;
                            item.product = temp.product;
                            updateItems.push(item);
                        }

                        orderSchema.items = updateItems;
                        orderSchema.fulfillments = protocolCancelResponse?.message?.order?.fulfillments;

                        //TODO: refund amount in full cancellation
                        await addOrUpdateOrderWithTransactionIdAndOrderId(
                            protocolCancelResponse.context.transaction_id, protocolCancelResponse.message.order.id,
                            { ...orderSchema }
                        );
                    }
                }

                return protocolCancelResponse;
            }

        }
        catch (err) {
            throw err;
        }
    }

    // New method to queue refund process
    async _queueRefundProcess(orderSchema) {
        try {
            await RefundQueue.create({
                orderId: orderSchema.payment.params.transaction_id, // merchantTransactionId
                // transactionId: orderSchema.transactionId,
                amount: orderSchema.payment.params.amount, // amount value calculate
                status: 'PENDING',
                // retryCount: 0,
                // orderData: orderSchema
            });
        } catch (error) {
            // Log error but don't throw
            console.error('Error queueing refund process:', error);
            // Notify admin about failed queue creation
            // await this._notifyRefundQueueError(orderSchema, error);
        }
    }

}

export default CancelOrderService;
