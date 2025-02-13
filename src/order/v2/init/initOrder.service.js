import { onOrderInit } from "../../../utils/protocolApis/index.js";
import { PROTOCOL_CONTEXT } from "../../../utils/constants.js";
import { addOrUpdateOrderWithTransactionId, getOrderByTransactionId,getOrderByTransactionIdAndProvider,addOrUpdateOrderWithTransactionIdAndProvider } from "../../v1/db/dbService.js";
import CartValidator from "../cart/v2/cart.validator.js";
import validateQuantity from "../../../utils/quantity.validator.js";

import BppInitService from "./bppInit.service.js";
import ContextFactory from "../../../factories/ContextFactory.js";
import SearchService from "../../../discovery/v2/search.service.js";
const bppSearchService = new SearchService();
const bppInitService = new BppInitService();
import crypto from 'crypto'
import { response } from "express";
import DeliveryAddressMongooseModel from "../../../accounts/deliveryAddress/db/deliveryAddress.js";
import BadRequestParameterError from "../../../lib/errors/bad-request-parameter.error.js";

class InitOrderService {

    async getShortHash(input) {
        // Create a SHA-256 hash of the input string
        const hash = crypto.createHash('sha256').update(input).digest('base64');
      
        // Take the first 12 characters of the base64 hash
        return hash.substring(0, 12);
      }

    /**
     * 
     * @param {Array} items 
     * @returns Boolean
     */
    areMultipleBppItemsSelected(items) {
        return items ? [...new Set(items.map(item => item.bpp_id))].length > 1 : false;
    }

    /**
     * 
     * @param {Array} items 
     * @returns Boolean
     */
    areMultipleProviderItemsSelected(items) {
        return items ? [...new Set(items.map(item => item.provider.id))].length > 1 : false;
    }

    areMultipleDomainItemsSelected(items) {
        return items ? [...new Set(items.map(item => item.domain))].length > 1 : false;
    }

    /**
     * create order in db
     * @param {Object} response 
     * @param {String} userId
     * @param {String} parentOrderId
     */
    async createOrder(response, userId = null, orderRequest) {
        if (response) {
            const provider = orderRequest?.items?.[0]?.provider || {};

            console.log("response", orderRequest)
            console.log("responseData" , response)
            const providerDetails = {
                id: provider.local_id,
                descriptor:provider.descriptor,
                locations: provider.locations.map(location => {
                    return { id: location.local_id };
                })
            };


            console.log("orderRequest---------name------->",orderRequest?.delivery_info?.name)
            console.log("orderRequest-----------delivery_info----->",orderRequest?.delivery_info)
            const fulfillment = {
                end: {
                    contact: {
                        email: orderRequest?.delivery_info?.email,
                        phone: orderRequest?.delivery_info?.phone
                    },
                    location: {
                        ...orderRequest?.delivery_info?.location,
                        address: {
                            ...orderRequest?.delivery_info?.location?.address,
                            name: orderRequest?.delivery_info?.name
                        }
                    },
                },
                type: orderRequest?.delivery_info?.type,
                customer: {
                    person: {
                        name: orderRequest?.delivery_info?.name
                    }
                },
                provider_id: provider?.local_id
            };

            console.log('itemProducts--------before------->',orderRequest.items);

            let itemProducts = []
            for(let item of orderRequest.items){


                let parentItemKeys
                if(item.customisations){
                    parentItemKeys = item?.local_id?.toString()+'_'+ item.customisations.map(item => item.local_id).join('_');

                }else{
                    parentItemKeys = item?.local_id?.toString()
                }
                let parentItemId =await this.getShortHash(parentItemKeys);

                let selectitem = {
                    id: item?.local_id?.toString(),
                    quantity: item?.quantity,
                    location_id: provider.locations[0].local_id?.toString()
                }
                let tag=undefined
                if(item.tags && item.tags.length>0){
                    tag= item.tags.find(i => i.code==='type');
                    if(tag){
                        selectitem.tags =[tag];
                    }
                }

                if(item?.parent_item_id){
                    //let parentItemId = parentItemId 
                    selectitem.parent_item_id = parentItemId;
                }

                selectitem.fulfillment_id =item?.fulfillment_id
                selectitem.product= item?.product
                itemProducts.push(selectitem);

                if(item.customisations){
                    for(let customisation of item.customisations){
                        let selectitem = {
                            id: customisation?.local_id?.toString(),
                            quantity: customisation.quantity,
                            location_id: provider.locations[0].local_id?.toString()
                        }
                        let tag=undefined
                        if(customisation.item_details.tags && customisation.item_details.tags.length>0){
                            tag= customisation.item_details.tags.filter(i =>{ return i.code==='type' || i.code==='parent'});
                            let finalTags = []
                            for(let tg of tag){
                                if(tg.code==='parent'){
                                    if(tg.list.length>0){
                                        tg.list= tg.list.filter(i =>{ return i.code==='id'});
                                    }
                                    finalTags.push(tg);
                                }else{
                                    finalTags.push(tg);
                                }
                            }
                            selectitem.tags =finalTags;
                        }
                        selectitem.fulfillment_id =item?.fulfillment_id
                        selectitem.parent_item_id = parentItemId;
                        selectitem.product= customisation
                        itemProducts.push(selectitem);
                    }

                }

            }

            console.log('itemProducts--------aftr------->',itemProducts);
            // console.log('itemProducts--------response?.context?.bpp_id------->',response?.context?.bpp_id);
            console.log('itemProducts--------response?.context?.bpp_id------->',fulfillment);

            const orderPaymentType = orderRequest.payment.type

            await addOrUpdateOrderWithTransactionIdAndProvider(
                response.context.transaction_id,provider.local_id,
                {
                    userId: userId,
                    messageId: response?.context?.message_id,
                    transactionId: response?.context?.transaction_id,
                    parentOrderId: response?.context?.parent_order_id,
                    bppId: response?.context?.bpp_id,
                    bpp_uri: response?.context?.bpp_uri,
                    fulfillments: [ fulfillment ],
                    provider: { ...providerDetails },
                    items:itemProducts ,
                    offers:orderRequest.offers,
                    paymentType:"ON-ORDER"
                }
            );
        }
        else{
            return response
        }
    }

    /**
     * update order in the db
     * @param {Object} response 
     * @param {Object} dbResponse
     */
    async updateOrder(response, dbResponse, session) {

        //console.log("update order-------------------->",dbResponse);
        //console.log("update order-----------response--------->",response);
        // console.log("update order-----------response--------->",orderSchema.fulfillment);
        if (response?.message?.order && dbResponse) {
            dbResponse = dbResponse?.toJSON();

            let orderSchema = { ...response.message.order };

            console.log("update order-----------fulfillment--------->",orderSchema.fulfillment);

            orderSchema.items = dbResponse?.items.map(item => {
                return {
                    id: item?.id?.toString(),
                    quantity: item.quantity,
                    product: item.product,
                    fulfillment_id:item?.fulfillment_id,
                    tags:item.tags,
                    parent_item_id:item.parent_item_id
                };
            }) || [];

            orderSchema.provider = {
                id: orderSchema?.provider?.id,
                locations: orderSchema?.provider?.locations ?? [],
                descriptor: dbResponse?.provider?.descriptor
            };

            orderSchema.settlementDetails = orderSchema.payment
            orderSchema.billing = {
                ...orderSchema?.billing,
                address: {
                    ...orderSchema?.billing.address,
                    areaCode: orderSchema?.billing?.address?.area_code
                }
            };

            if(orderSchema.fulfillment) {
                orderSchema.fulfillments = [orderSchema.fulfillment];
                delete orderSchema.fulfillment;
            }


            console.log("update order----------orderSchema?.billing--------->",orderSchema?.billing);
            console.log("update order----------orderSchema?.billing---quote------>",orderSchema?.quote);
            console.log("update order----------orderSchema?.billing--response -quote------>",dbResponse?.quote);

            dbResponse.quote = orderSchema.quote

            if (orderSchema.fulfillments && orderSchema.fulfillments.length) {
                orderSchema.fulfillments = [...orderSchema?.fulfillments].map((fulfillment)=> {
                    return {
                    ...fulfillment,
                    end: {
                        ...fulfillment?.end,
                        location: {
                            ...fulfillment?.end?.location,
                            address: {
                                ...fulfillment?.end?.location?.address,
                                areaCode: fulfillment?.end?.location?.address?.area_code
                            }
                        }
                    },
                        customer:dbResponse?.fulfillments[0]?.customer
                }});
            }

            await addOrUpdateOrderWithTransactionIdAndProvider(
                response?.context?.transaction_id,
                dbResponse.provider.id,
                { ...orderSchema },
                session
            );
        }
    }

    /**
    * init order
    * @param {Object} orderRequest
    * @param {Boolean} isMultiSellerRequest
    */
    async initOrder(orderRequest, isMultiSellerRequest = false) {
        try {
            const { context: requestContext = {}, message: order = {} } = orderRequest || {};
            const parentOrderId = requestContext?.transaction_id; //FIXME: verify usage

            console.log("order--->",orderRequest)

            //get bpp_url and check if item is available
            let itemContext={}
            let itemPresent= { default: true }
            for(let [index,item] of order.items.entries()){
                let items =  await bppSearchService.getItemDetails(
                    {id:item.itemId}
                );
    
                if(!items){
                    itemPresent = {
                        default : false,
                        itemId: item?.itemId
                    }
                    break;
                }else{

                    const checkQuantity = validateQuantity(items , item)
                    
                    if(checkQuantity?.status==400){
                        throw new BadRequestParameterError(checkQuantity?.error?.message)
                    }
    
                    if(item?.customizations && item.customizations.length > 0 && items?.customisation_items?.length == 0){
                        throw new BadRequestParameterError(`No custumaztion available for item:${item?.itemId}`)
                    }
    
                    let matchedItems = []
    
                    if (item?.customizations && item.customizations.length > 0 && items?.customisation_items?.length > 0) {

                        const validator = new CartValidator(items.customisation_groups, items.customisation_items);
                        const validationResult = validator.validateAddToCartRequest(item , items);

                        if (validationResult!==null && !validationResult.isValid) {
                            throw new BadRequestParameterError(validationResult.errors?.[0])
                        }
                        
                        const errors = item.customizations.map(({ groupId, choiceId }) => {
                            // Find a matching backend customization item
                            const matchingBackendItem = items.customisation_items.find(backendItem =>
                                backendItem.item_details.tags.some(tag =>
                                    tag.code === 'parent' && tag.list.some(({ value }) => value === groupId)) &&
                                backendItem.item_details.id === choiceId);
    
                            if (!matchingBackendItem) {
                                return `Customization with groupId ${groupId} and choiceId ${choiceId} does not match available options.`;
                            } else {
                                // If there's a match, push the item details to matchedItems
                                matchedItems.push({...matchingBackendItem.item_details , quantity: {count: item.quantity}});
                                return null; // No error for this customization
                            }
                        })
                        .filter(error => error !== null);
    
                        if(errors.length > 0){
                            throw new BadRequestParameterError(errors[0])
                        }
                    }
    
                    itemContext = items.context
                    order.items[index] = {
                        bpp_id:items?.context?.bap_id,
                        bpp_uri:items?.context?.bpp_uri,
                        id:items?.id,
                        domain:items?.context?.domain,
                        local_id:items?.item_details?.id,
                        tags:items?.item_details?.tags,
                        quantity:{
                            count: item.quantity
                        },
                        provider:{
                            id: items?.provider_details?.id,
                            local_id: items?.provider_details?.local_id,
                            locations: items?.locations,
                            ...items?.provider_details
                        },
                        product:{
                            id: items?.id,
                            ...items?.item_details
                        },
                        customizations: item?.customizations ? matchedItems : []
                    }
                }
            }

            if(!itemPresent?.default){
                throw new NoRecordFoundError(`item not found with id:${itemPresent.itemId}`)

            }


            const contextFactory = new ContextFactory();
            const context = contextFactory.create({
                action: PROTOCOL_CONTEXT.INIT,
                bppId: itemContext?.bpp_id,
                bpp_uri: itemContext?.bpp_uri,
                city:requestContext.city,
                state:requestContext.state,
                transactionId: requestContext?.transaction_id,
                domain:requestContext?.domain,
                pincode:requestContext?.pincode,
                // ...(!isMultiSellerRequest && { transactionId: requestContext?.transaction_id })
            });

            if (!(order?.items?.length)) {
                throw new BadRequestParameterError("Empty order received")
            }
            else if (this.areMultipleBppItemsSelected(order?.items)) {
                throw new BadRequestParameterError("More than one BPP's item(s) selected/initialized")
            }
            else if (this.areMultipleProviderItemsSelected(order?.items)) {
                throw new BadRequestParameterError("More than one Provider's item(s) selected/initialized")
            }
            else if (this.areMultipleDomainItemsSelected(order?.items)) {
                throw new BadRequestParameterError("More than one Domains's item(s) selected/initialized")
            }

            const bppResponse = await bppInitService.init(
                context,
                order,
                parentOrderId
            );

            return bppResponse;
        }
        catch (err) {
            console.log("error in initOrder---->",err)
            if(err instanceof NoRecordFoundError || err instanceof BadRequestParameterError){
                throw err
            }
            throw err;
        }
    }

    /**
     * init multiple orders
     * @param {Array} orders 
     * @param {Object} user
     */
    async initMultipleOrder(orders, user) {

        console.log("orders------->",orders)
        // Find the existing delivery address by its ID
        let storedDeliveryAddress = await DeliveryAddressMongooseModel.findOne({ id: orders?.[0]?.message?.delivery_info?.id , userId: user.decodedToken.uid })
            
        if (!storedDeliveryAddress) {
            throw new BadRequestParameterError(`Delivery address not found with id:${orders?.[0]?.message?.delivery_info?.id}`)
        }

        const initOrderResponse = await Promise.all(
            orders.map(async order => {
                try {
                    console.log("orders---pre---->",order)
                    const transformedOrder = {
                        context: {
                            city: order?.context?.city,
                            domain: order?.context?.domain,
                            transaction_id: order?.context?.transaction_id,
                        },
                        message: {
                            items: order?.items.map(item => ({
                                itemId: item?.itemId,
                                quantity: item?.quantity,
                                customizations: item?.customizations
                            })),
                            fulfillments: order?.fulfillments.map(fulfillment => ({ 
                                id: fulfillment?.id,
                                type: fulfillment.type
                            })),
                            offers: order?.offers,
                            billing_info: {
                                address: {
                                    door: storedDeliveryAddress?.address?.door,
                                    building: storedDeliveryAddress?.address?.building,
                                    street: storedDeliveryAddress?.address?.street,
                                    city: storedDeliveryAddress?.address?.city,
                                    state: storedDeliveryAddress?.address?.state,
                                    country: storedDeliveryAddress?.address?.country,
                                    areaCode: storedDeliveryAddress?.address?.areaCode,
                                    tag: storedDeliveryAddress?.address?.tag,
                                    lat: storedDeliveryAddress?.address?.lat,
                                    lng: storedDeliveryAddress?.address?.lng
                                },
                                phone: storedDeliveryAddress?.descriptor?.phone,
                                name: storedDeliveryAddress?.descriptor?.name,
                                email: storedDeliveryAddress?.descriptor?.email
                            },
                            delivery_info: {
                                type: order?.fulfillments[0].type || "Delivery",
                                name: storedDeliveryAddress?.descriptor?.name,
                                phone: storedDeliveryAddress?.descriptor?.phone,
                                email: storedDeliveryAddress?.descriptor?.email,
                                location: {
                                    gps: storedDeliveryAddress?.gps,
                                    address: {
                                        door: storedDeliveryAddress?.address?.door,
                                        building: storedDeliveryAddress?.address?.building,
                                        street: storedDeliveryAddress?.address?.street,
                                        city: storedDeliveryAddress?.address?.city,
                                        state: storedDeliveryAddress?.address?.state,
                                        country: storedDeliveryAddress?.address?.country,
                                        areaCode: storedDeliveryAddress?.address?.areaCode,
                                        tag: storedDeliveryAddress?.address?.tag,
                                        lat: storedDeliveryAddress?.address?.lat,
                                        lng: storedDeliveryAddress?.address?.lng
                                    }
                                }
                            },
                            payment: {
                                type: order?.payment?.type
                            }
                        }
                    }
                    
                    const bppResponse = await this.initOrder(transformedOrder, orders.length > 1);

                    if(bppResponse?.error && Object.keys(bppResponse?.error).length == 0){
                        return bppResponse
                    }
                    await this.createOrder(bppResponse, user?.decodedToken?.uid, transformedOrder?.message);
                    return bppResponse;
                }
                catch (err) {
                    if(err instanceof BadRequestParameterError){
                        throw new err
                    }
                    console.error("Order processing error:", err);
                    return err
                }

            })
        );

        return initOrderResponse;
    }

    /**
    * on init order
    * @param {Object} messageId
    */
    async onInitOrder(messageId) {
        try {
            let protocolInitResponse = await onOrderInit(messageId);

            if (!(protocolInitResponse && protocolInitResponse.length) ||
                protocolInitResponse?.[0]?.error
            ) {
                const contextFactory = new ContextFactory();
                const context = contextFactory.create({
                    messageId: messageId,
                    action: PROTOCOL_CONTEXT.ON_INIT,
                    transactionId: protocolInitResponse?.[0]?.context?.transaction_id
                });

                return {
                    context,
                    error: {
                        message: "No data found"
                    }
                };
            } else {
                protocolInitResponse = protocolInitResponse?.[0];
                return protocolInitResponse;
            }
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * on init multiple order
    * @param {Object} messageIds
    */
    async onInitMultipleOrder(messageIds) {
        let session;
        try {

            session = await mongoose.startSession(); // Start a new session
            session.startTransaction(); // Begin the transaction

            const onInitOrderResponse = await Promise.all(
                messageIds.map(async messageId => {
                    try {
                        let protocolInitResponse = await this.onInitOrder(messageId);

                        console.log("protocolResponse", protocolInitResponse)

                        if(protocolInitResponse?.error){
                            return protocolInitResponse
                        }

                        //console.log("protocolInitResponse------------->",protocolInitResponse);
                        //console.log("protocolInitResponse-------provider------>",protocolInitResponse.message.order.provider);

                        let dbResponse = await getOrderByTransactionIdAndProvider(
                            protocolInitResponse?.context?.transaction_id,
                            protocolInitResponse?.message.order.provider.id,
                            session
                        );

                        //console.log("on init --protocolInitResponse--dbResponse",dbResponse);

                        await this.updateOrder(protocolInitResponse, dbResponse , session);

                        dbResponse = dbResponse?.toJSON();

                        protocolInitResponse.context = {
                            ...protocolInitResponse?.context,
                            parent_order_id: dbResponse?.parentOrderId
                        };

                        return protocolInitResponse;
                    }
                    catch (err) {
                        throw err;
                    }
                })
            );

            await session.commitTransaction(); // Commit the transaction
            session.endSession();

            return onInitOrderResponse;
        }
        catch (err) {
            if(session){
                await session.abortTransaction(); // Rollback the transaction
                session.endSession();
            }
            throw err;
        }
    }
}

export default InitOrderService;
