import { v4 as uuidv4 } from 'uuid';
import {PAYMENT_URL} from "../../../utils/constants.js"
import { PAYMENT_COLLECTED_BY, PAYMENT_TYPES, PROTOCOL_PAYMENT } from "../../../utils/constants.js";
import {protocolConfirm, protocolGetDumps} from '../../../utils/protocolApis/index.js';
import OrderMongooseModel from "../../v1/db/order.js";

class BppConfirmService {

    /**
     * bpp confirm order
     * @param {Object} confirmRequest 
     * @returns 
     */
    async confirm(confirmRequest = {}) {
        try {

            const response = await protocolConfirm(confirmRequest);

            if(response.error){
                return { message: response.message ,error:response.error};
            }else{
                return { context: confirmRequest.context, message: response.message };
            }

        }
        catch (err) {

            //set confirm request in error data
            err.response.data.confirmRequest =confirmRequest
            throw err;
        }
    }

    pad(str, count=2, char='0') {
        str = str.toString();
        if (str.length < count)
            str = Array(count - str.length).fill(char).join('') + str;
        return str;
    };

    /**
     * bpp confirm order
     * @param {Object} context 
     * @param {Object} order 
     * @returns 
     */
    async confirmV1(context, order = {}) {
        try {

            const provider = order?.items?.[0]?.provider || {};

            const confirmRequest = {
                context: context,
                message: {
                    order: {
                        id: uuidv4(),
                        billing: order.billing_info,
                        items: order?.items,
                        provider: {
                            id: provider.id,
                            locations: provider.locations.map(location => {
                                return { id: location }
                            })
                        },
                        fulfillments: [{
                            end: {
                                contact: {
                                    email: order.delivery_info.email,
                                    phone: order.delivery_info.phone
                                },
                                location: order.delivery_info.location,
                            },
                            type: order.delivery_info.type,
                            customer: {
                                person: {
                                    name: order.delivery_info.name
                                }
                            },
                            provider_id: provider.id
                        }],
                        payment: {
                            params: {
                                amount: order?.payment?.paid_amount?.toString(),
                                currency: "INR",
                                transaction_id:order?.jusPayTransactionId//payment transaction id
                            },
                            status: order?.payment?.type === PAYMENT_TYPES["ON-ORDER"] ?
                                PROTOCOL_PAYMENT.PAID :
                                PROTOCOL_PAYMENT["NOT-PAID"],
                            type: order?.payment?.type,
                            collected_by: order?.payment?.type === PAYMENT_TYPES["ON-ORDER"] ? 
                                PAYMENT_COLLECTED_BY.BAP : 
                                PAYMENT_COLLECTED_BY.BPP,
                        },
                        quote: {
                            ...order?.quote
                        },
                        created_at:new Date(),
                        updated_at:new Date()
                    }
                }
            }

            console.log("confirmRequest----------v2----------->",confirmRequest.message.order.payment.params);

            return await this.confirm(confirmRequest);
        }
        catch (err) {
            throw err;
        }
    }

    /**
     * bpp confirm order v2
     * @param {Object} context 
     * @param {Object} order 
     * @param {Object} storedOrder 
     * @returns 
     */
    async confirmV2(context, order = {}, storedOrder = {}) {
        try {
            storedOrder = storedOrder?.toJSON();

            const n = new Date();
            const count = await OrderMongooseModel.count({
            });


            //get TAT object from select request
            let on_select = await protocolGetDumps({type:"on_select",transaction_id:context.transaction_id})

            if(!on_select || on_select.error){
                return{
                    message:{
                        ack:{
                            status:"NACK"
                        }
                    },
                    error:{
                        type: "server-error",
                        code: 500,
                        message: "Internal Server Error"
                    }
                  }
                }

            console.log("on_select------------->",on_select)

            let on_select_fulfillments = on_select.request?.message?.order?.fulfillments??[]


            let orderId = `${n.getFullYear()}-${this.pad(n.getMonth()+1)}-${this.pad(n.getDate())}-${Math.floor(100000 + Math.random() * 900000)}`;

            let qoute = {...(order?.quote || storedOrder?.quote)}

            let value = ""+qoute?.price?.value
            qoute.price.value = value


            //find terms from init call

            let bpp_term = storedOrder?.tags?.find(x => x.code === 'bpp_terms')

            let tax_number = bpp_term?.list?.find(x => x.code === 'tax_number')

            console.log(bpp_term)
            let bpp_terms =[
                bpp_term,
                {
                    code:"bap_terms",
                    list:
                        [
                            {
                                "code":"tax_number",
                                "value":process.env.BAP_GST_NUMBER || "22AAAAA0000A1Z5" 
                            }
                        ]
                }
            ]

            // Created - when created by the buyer app;
            // Accepted - when confirmed by the seller app;
            // In-progress - when order is ready to ship;
            // Completed - when all fulfillments completed
            // Cancelled - when order cancelled

            console.log({id:storedOrder?.provider.id,locations:storedOrder?.provider.locations})
            const confirmRequest = {
                context: context,
                message: {
                    order: {
                        id: orderId,
                        state:"Created",
                        billing: {
                            address: {
                                name: storedOrder?.billing?.address?.name,
                                building: storedOrder?.billing?.address?.building,
                                locality: storedOrder?.billing?.address?.locality,
                                ward: storedOrder?.billing?.address?.ward,
                                city: storedOrder?.billing?.address?.city,
                                state: storedOrder?.billing?.address?.state,
                                country: storedOrder?.billing?.address?.country,
                                area_code: storedOrder?.billing?.address?.areaCode
                            },
                            phone: storedOrder?.billing?.phone,
                            name: storedOrder?.billing?.name,
                            email: storedOrder?.billing?.email,
                            created_at:storedOrder?.billing?.created_at,
                            updated_at:storedOrder?.billing?.updated_at
                        },
                        items: storedOrder?.items && storedOrder?.items?.length &&
                            [...storedOrder?.items].map(item => {
                                return {
                                    id: item.id,
                                    quantity: {
                                        count: item.quantity.count
                                    },
                                    fulfillment_id: item.fulfillment_id,
                                    tags:item.tags,
                                    parent_item_id:item.parent_item_id??undefined
                                };
                            }) || [],
                        provider: {id:storedOrder?.provider.id,locations:storedOrder?.provider.locations},
                        fulfillments: [...storedOrder.fulfillments].map((fulfillment) => {

                            console.log(on_select_fulfillments)
                            console.log(fulfillment)
                           let mappedFulfillment = on_select_fulfillments.find((data)=>{return data.id==fulfillment?.id});

                            console.log("mappedFulfillment",mappedFulfillment)
                            console.log(mappedFulfillment)

                            return {
                                '@ondc/org/TAT':mappedFulfillment['@ondc/org/TAT'],
                                id: fulfillment?.id,
                                tracking: fulfillment?.tracking??false,
                                end: {
                                    contact: {
                                        email: fulfillment?.end?.contact?.email,
                                        phone: fulfillment?.end?.contact?.phone,
                                    },
                                    person: {
                                        name: fulfillment?.customer?.person?.name
                                    },
                                    location: {
                                        gps: fulfillment?.end?.location?.gps,
                                        address: {
                                            name: fulfillment?.end?.location?.address?.name,
                                            building: fulfillment?.end?.location?.address?.building,
                                            locality: fulfillment?.end?.location?.address?.locality,
                                            ward: fulfillment?.end?.location?.address?.ward,
                                            city: fulfillment?.end?.location?.address?.city,
                                            state: fulfillment?.end?.location?.address?.state,
                                            country: fulfillment?.end?.location?.address?.country,
                                            area_code: fulfillment?.end?.location?.address?.areaCode
                                        }
                                    }
                                },
                                type: fulfillment?.type || "Delivery"
                            }
                        }),
                        payment: {
                            uri: (storedOrder?.payment?.type ||  order?.payment?.type) === PAYMENT_TYPES["ON-ORDER"] ?
                                PAYMENT_URL:
                                undefined, //In case of pre-paid collection by the buyer app, the payment link is rendered after the buyer app sends ACK for /on_init but before calling /confirm;
                            tl_method:(storedOrder?.payment?.type ||  order?.payment?.type) === PAYMENT_TYPES["ON-ORDER"] ?
                                "http/post":
                                undefined,
                            params: {
                                amount: Number(value)?.toFixed(2)?.toString() || order?.payment?.paid_amount?.toFixed(2)?.toString(),
                                currency: "INR",
                                transaction_id:(storedOrder?.payment?.type ||  order?.payment?.type) === PAYMENT_TYPES["ON-ORDER"] ?
                                    order.jusPayTransactionId??uuidv4():
                                    undefined//payment transaction id
                            },
                            status:(storedOrder?.payment?.type ||  order?.payment?.type)=== PAYMENT_TYPES["ON-ORDER"] ?
                                PROTOCOL_PAYMENT.PAID :
                                PROTOCOL_PAYMENT["NOT-PAID"],
                            type: (storedOrder.payment?.type ||  order?.payment?.type),
                            collected_by: (storedOrder.payment?.type ||  order?.payment?.type) === PAYMENT_TYPES["ON-ORDER"] ? 
                                PAYMENT_COLLECTED_BY.BAP : 
                                PAYMENT_COLLECTED_BY.BPP,
                            '@ondc/org/buyer_app_finder_fee_type': process.env.BAP_FINDER_FEE_TYPE,
                            '@ondc/org/buyer_app_finder_fee_amount':  process.env.BAP_FINDER_FEE_AMOUNT,
                            '@ondc/org/settlement_basis': order.payment['@ondc/org/settlement_basis']??storedOrder?.settlementDetails?.["@ondc/org/settlement_basis"],
                            '@ondc/org/settlement_window': order.payment['@ondc/org/settlement_window']??storedOrder?.settlementDetails?.["@ondc/org/settlement_window"],
                            '@ondc/org/withholding_amount': order.payment['@ondc/org/withholding_amount']??storedOrder?.settlementDetails?.["@ondc/org/withholding_amount"],
                            "@ondc/org/settlement_details":(storedOrder.payment?.type ||  order?.payment?.type) === PAYMENT_TYPES["ON-ORDER"] ?
                                storedOrder?.settlementDetails?.["@ondc/org/settlement_details"]:
                                order.payment['@ondc/org/settlement_details'],

                        },
                        quote: {
                            ...(qoute)
                        },
                        tags: bpp_terms,
                        created_at:context.timestamp,
                        updated_at:context.timestamp
                    }
                }
            };

                        
            if (storedOrder.offers && storedOrder.offers.length) {
                confirmRequest.message.order.offers = storedOrder.offers.map(offer => {
                    return { id: offer };
                  });
            }
            

            console.log({confirmRequest})

            let confirmResponse;
            let retryAttempts = 3;
            for (let i = 0; i < retryAttempts; i++) {
                confirmResponse = await this.confirm(confirmRequest);
                if (!confirmResponse.error) break;
                console.log(`Retrying confirm request... Attempt ${i + 1}`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay before retry
            }
            
            return confirmResponse

           // return await this.confirm(confirmRequest);
        }
        catch (err) {
            throw err;
        }
    }
}

export default BppConfirmService;
