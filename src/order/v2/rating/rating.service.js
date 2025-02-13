import { onOrderSelect } from "../../../utils/protocolApis/index.js";
import { PROTOCOL_CONTEXT } from "../../../utils/constants.js";

import ContextFactory from "../../../factories/ContextFactory.js";
import BppRatingService from "./bppRating.service.js";
import Rating from "../db/fulfillments copy.js";
const bppRatingService = new BppRatingService();
import {
    addOrUpdateOrderWithTransactionId,getOrderRequestLatestFirst,
    addOrUpdateOrderWithTransactionIdAndProvider,
    getOrderById, getOrderRequest, saveOrderRequest
} from "../../v1/db/dbService.js";
import BadRequestParameterError from "../../../lib/errors/bad-request-parameter.error.js";
import NoRecordFoundError from "../../../lib/errors/no-record-found.error.js";

class RatingService {

    /**
    * select order
    * @param {Object} orderRequest
    */
    async rateOrder(rating,id) {
        try {

            if(!id){
                throw new BadRequestParameterError("Missing OrderId")
            }

            // const { context: requestContext, message } = rating || {};

            const orderDetails = await getOrderById(id);

            if(!orderDetails){
                throw new NoRecordFoundError("Order not found with id:${id}")
            }

            console.log('domain--------XX------>',orderDetails)

        // orderId:{ type: String },
        // entityId:{ type: String },
        // rating:{ type: String },
        // type:{ type: String },

            for(let ratingDetails of rating){
                switch(ratingDetails.rating_category){
                    case "order": 
                        if(ratingDetails.id !== orderDetails[0].id){
                            throw new BadRequestParameterError("The provided Order ID does not match the actual Order ID")
                        }
                    break;
                    case "item": 
                        const item =  orderDetails[0].items.find(item => item.id === orderDetails.id)
                        if(!item) throw new BadRequestParameterError("The Item ID provided does not belong to this order")
                    break;
                    case "provider": 
                        if(ratingDetails.id !== orderDetails[0]?.provider?.id){
                            throw new BadRequestParameterError("The Provider ID does not match the provider associated with this order")
                        }
                    break;
                    case "fullfilment": 
                        if(ratingDetails.id !== orderDetails[0]?.fulfillments?.[0]?.id){
                            throw new BadRequestParameterError("The Fulfillment ID does not match the fulfillment associated with this order")
                        }
                    break;
                }
                let oldRating = await Rating.findOne({orderId:id,type:ratingDetails.rating_category,entityId:ratingDetails.id});
                console.log("old rating",oldRating)
                if(oldRating){
                    //update
                    oldRating.rating = ratingDetails.value
                    await oldRating.save();
                }else{
                    let newRating = new Rating();
                    newRating.type=ratingDetails.rating_category;
                    newRating.entityId=ratingDetails.id;
                    newRating.rating=ratingDetails.value;
                    newRating.orderId=id
                    await newRating.save();
                }
            }

            const contextFactory = new ContextFactory();
            const context = contextFactory.create({
                action: PROTOCOL_CONTEXT.RATING,
                transactionId: orderDetails[0]?.transactionId,
                bppId: orderDetails[0]?.bppId,
                bpp_uri: orderDetails[0]?.bpp_uri,
                cityCode: orderDetails[0].city,
                city: orderDetails[0].city,
                domain:orderDetails[0].domain
            });

            return await bppRatingService.getRating(
                context,
                rating
            );
        }
        catch (err) {

            if(err instanceof  BadRequestParameterError) throw err
            throw err;
        }
    }

    async getRating(rating,id) {
        try {
            const ratings = await Rating.find({ orderId: id }).lean();
            console.log(ratings)
            return ratings
        }
        catch (err) {
            throw err;
        }
    }


    /**
    * on select multiple order
    * @param {Object} messageId
    */
    async onRateOrder(messageIds) {
        try {
            const onSelectOrderResponse = await Promise.all(
                messageIds.map(async messageId => {
                    try {
                        const onSelectResponse = await this.onSelectOrder(messageId);
                        return { ...onSelectResponse };
                    }
                    catch (err) {
                        throw err;
                    }
                })
            );

            return onSelectOrderResponse;
        }
        catch (err) {
            throw err;
        }
    }
}

export default RatingService;
