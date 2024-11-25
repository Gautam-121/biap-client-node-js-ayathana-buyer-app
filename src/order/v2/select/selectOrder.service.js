import { onOrderSelect } from "../../../utils/protocolApis/index.js";
import { PROTOCOL_CONTEXT } from "../../../utils/constants.js";
import {RetailsErrorCode} from "../../../utils/retailsErrorCode.js";
import validateQuantity from "../../../utils/quantity.validator.js";

import CartValidator from "../cart/v2/cart.validator.js";
import NoRecordFoundError from "../../../lib/errors/no-record-found.error.js";
import ContextFactory from "../../../factories/ContextFactory.js";
import BppSelectService from "./bppSelect.service.js";
import SearchService from "../../../discovery/v2/search.service.js";
const bppSearchService = new SearchService();
const bppSelectService = new BppSelectService();

class SelectOrderService {

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
     * 
     * @param {Object} response 
     * @returns 
     */
    transform(response) {

        let error =  response.error ? Object.assign({}, response.error, {
            message: response.error.message?response.error.message:RetailsErrorCode[response.error.code],
        }):null;

        return {
            context: response?.context,
            message: response?.message && {
                quote: {
                    ...response?.message?.order
                }
            },
            error:error
        };
    }

    /**
    * select order
    * @param {Object} orderRequest
    */
    async selectOrder(orderRequest) {
        try {
            const { context: requestContext, message = {} } = orderRequest || {};
            const { cart = {}, fulfillments = [], offers=[] } = message;
    
            //get bpp_url and check if item is available
            let itemContext={}
            let itemPresent= { default: true }
            for(let [index,item] of cart.items.entries()){
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
                        return checkQuantity
                    }

                    if(item?.customizations && item.customizations.length > 0 && items?.customisation_items?.length == 0){
                        return { status: 400 , error: { message: `No custumaztion available for item:${item?.itemId}`} }
                    }
    
                    let matchedItems = []
    
                    if (item?.customizations && item.customizations.length > 0 && items?.customisation_items?.length > 0) {

                        const validator = new CartValidator(items.customisation_groups, items.customisation_items);
                        const validationResult = validator.validateAddToCartRequest(item , items);

                        if (validationResult!==null && !validationResult.isValid) {
                            return { status: 400 , error: { message: validationResult.errors?.[0]} }
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
                            return { status: 400 , error: { message: errors[0]} }
                        }
                    }
    
                    itemContext = items.context
                    cart.items[index] = {
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
                            locations: items?.locations,
                            local_id: items?.provider_details?.local_id,
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
                return {
                    status: 404,
                    error: { name: "NO_RECORD_FOUND_ERROR" , message: `item not found with id:${itemPresent.itemId}` }
                }
            }
    
            const contextFactory = new ContextFactory();
            const context = contextFactory.create({
                action: PROTOCOL_CONTEXT.SELECT,
                transactionId: requestContext?.transaction_id ,
                bppId: itemContext?.bpp_id,
                bpp_uri: itemContext?.bpp_uri,
                city:requestContext?.city ,
                pincode:requestContext?.pincode,
                state:requestContext?.state,
                domain:requestContext?.domain
            });
    
            if (!(cart?.items || cart?.items?.length)) {
                return { 
                    error: { message: "Empty order received" }
                };
            } else if (this.areMultipleBppItemsSelected(cart?.items)) {
                return { 
                    error: { message: "More than one BPP's item(s) selected/initialized" }
                };
            }
            else if (this.areMultipleProviderItemsSelected(cart?.items)) {
                return { 
                    error: { message: "More than one Provider's item(s) selected/initialized" }
                };
            }
            else if (this.areMultipleDomainItemsSelected(cart?.items)) {
                return { 
                    error: { message: "More than one Domains's item(s) selected/initialized" }
                };
            }
    
            return await bppSelectService.select(
                context,
                { cart, fulfillments,offers }
            );
        }
        catch (err) {
            throw err;
        }
    }

    /**
     * select multiple orders
     * @param {Array} requests 
     */
    async selectMultipleOrder(requests) {

        console.log("requests--->",JSON.stringify(requests))
        const selectOrderResponse = await Promise.all(
            requests.map(async request => {
                try {
                    request = {
                        context: {
                            domain: request?.context?.domain,
                            city: request?.context?.city,
                        },
                        message: {
                            cart: {
                                items: request?.message?.cart?.items.map(item => ({
                                    itemId: item?.itemId,
                                    quantity: item?.quantity,
                                    customizations: item?.customizations
                                })),
                                offers: request?.message?.offers,
                                fulfillments: request?.message?.fulfillments.map(fulfillment => ({
                                    end:{
                                        location: {
                                            gps: fulfillment?.end?.location?.gps,
                                            address: {
                                                areaCode: fulfillment?.end?.location?.address?.areaCode,
                                            }
                                        },
                                    }
                                })) 
                            }
                        }
                    }
                    const response = await this.selectOrder(request);
                    return response;
                }
                catch (err) {
                    return err;
                }
            })
        );

        return selectOrderResponse;
    }

    /**
    * on select order
    * @param {Object} messageId
    */
    async onSelectOrder(messageId) {
        try {
            const protocolSelectResponse = await onOrderSelect(messageId);

            // if (!(protocolSelectResponse && protocolSelectResponse.length)  ||
            //     protocolSelectResponse?.[0]?.error) {
            //     const contextFactory = new ContextFactory();
            //     const context = contextFactory.create({
            //         messageId: messageId,
            //         action: PROTOCOL_CONTEXT.ON_SELECT
            //     });
            //
            //     return {
            //         context,
            //         error: protocolSelectResponse?.[0]?.error
            //     };
            // } else {
                // return this.transform(protocolSelectResponse?.[0]);
            // }

            if(protocolSelectResponse?.error?.code){
                return this.transform(protocolSelectResponse)
            }
            else{
                return this.transform(protocolSelectResponse?.[0]);
            }
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * on select multiple order
    * @param {Object} messageId
    */
    async onSelectMultipleOrder(messageIds) {
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

export default SelectOrderService;
