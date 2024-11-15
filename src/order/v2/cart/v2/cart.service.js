import Cart from '../../db/cart.js'
import CartItem from '../../db/items.js'
import SearchService from "../../../../discovery/v2/search.service.js";
import CartValidator from './cart.validator.js';
import NoRecordFoundError from '../../../../lib/errors/no-record-found.error.js';
import validateQuantity from '../../../../utils/quantity.validator.js';
const bppSearchService = new SearchService();
class CartService {

    async addItem(data) {
        try {
                let items =  await bppSearchService.getItemDetails(
                    {id:data.itemId}
                );
                if(!items){
                    throw new NoRecordFoundError(`item not found with id:${data.itemId}`);
                }

                const checkQuantity = validateQuantity(items , data)

                if(checkQuantity?.status==400){
                    return checkQuantity
                }

            if(items?.customisation_groups.length==0 && items?.customisation_items?.length == 0 && data.customizations?.length>0){
                return { status: 400, error : {  message: 'No custumzation availabe for item'}}
            }

            let validationResult = null;

            if(items?.customisation_groups.length!==0 && items?.customisation_items?.length !== 0){
                const validator = new CartValidator(items.customisation_groups, items.customisation_items);
                validationResult = validator.validateAddToCartRequest(data , items);
            }

            if (validationResult!==null && !validationResult.isValid) {
                return { status: 400 , error: { message: validationResult.errors?.[0]} }
            }

           let cart = await Cart.findOne({userId:data.userId,location_id:data.location_details?.id});

           const processedData = {
                id: data.itemId,
                local_id: items?.local_id,
                bpp_id: items?.bpp_details?.bpp_id,
                bpp_uri: items?.context?.bpp_uri,
                domain: items?.context?.domain,
                tags: items?.item_details?.tags,
                contextCity: items?.context?.city,
                quantity: {
                    count: data.quantity
                },
                provider: {
                    id: items?.provider_details?.id,
                    local_id: items?.provider_details?.local_id,
                    locations: items?.locations,
                    ...items?.provider_details
                },
                product:{
                    id: items?.id,
                    ...items?.item_details
                },
                customizations:null,
                customisationState:[],
                basePrice: (parseFloat(items.item_details?.price?.value) || 0) * data.quantity ,
                totalPrice: (parseFloat(items.item_details?.price?.value) || 0) * data.quantity,
                userId: data.userId
            };

           let proccesingData = validationResult ? {...validationResult.processedData , userId : data.userId } : processedData

           if(cart){
               //add items to the cart
               let cartItem = new CartItem();
               cartItem.cart=cart._id;
               cartItem.item = proccesingData;
               cartItem.location_id =data.location_details?.id
              return  await cartItem.save();
           }else{
               //create a new cart
               let cart =await new Cart({userId:data.userId,location_id:data.location_details?.id}).save()
               let cartItem = new CartItem();
               cartItem.cart=cart._id;
               cartItem.location_id =data.location_details?.id
               cartItem.item = proccesingData;
               return  await cartItem.save();
           }

        }
        catch (err) {
            throw err;
        }
    }

    async updateItem(data) {
        try {
            let items =  await bppSearchService.getItemDetails(
                {id:data.itemId}
            );
            if(!items){
                throw new NoRecordFoundError(`item not found with id:${data.itemId}`);
            }

            const checkQuantity = validateQuantity(items , data)

            if(checkQuantity?.status==400){
                return checkQuantity
            }

            if(items?.customisation_groups.length==0 && items?.customisation_items?.length == 0 && data.customizations?.length>0){
                return { status: 400, error : {  message: 'No custumzation availabe for item'}}
            }

            let cartItem = await CartItem.findOne({_id:data.cartItemId});
            if(!cartItem){
                return {
                    status: 404,
                    error:{
                        message: "Cart item not found"
                    }
                }
            }

            let validationResult = null;
            let cartCustomData = cartItem.item?.customisationState.length>0 ?  cartItem.item?.customisationState.map(custom=>{
                return {
                    groupId: custom.groupId,
                    choiceId: custom.choiceId
                }
            }): []

            let hasCustomisations = items?.customisation_groups.length!==0 && items?.customisation_items?.length !== 0
            let customizationsChanged = true

            if(cartCustomData.length!==data.customizations.length){
                customizationsChanged = false
            }
            else{
                customizationsChanged = cartCustomData.every(existing => 
                    data.customizations.some(newCust => 
                        existing.groupId === newCust.groupId && 
                        existing.choiceId === newCust.choiceId
                    )
                );
            }

            if(hasCustomisations && !customizationsChanged ){
                const validator = new CartValidator(items.customisation_groups, items.customisation_items);
                validationResult = validator.validateAddToCartRequest(data , items);
            }

            if (validationResult!==null && !validationResult.isValid) {
                return { status: 400 , error: { message: validationResult.errors?.[0]} }
            }

             // 7. Prepare update data
            let updatedItemData = {
                ...cartItem.item,
            };

            // Only update customizations if they were changed and validated
            if (validationResult?.processedData) {
                updatedItemData.customisationState = validationResult.processedData.customisationState;
                updatedItemData.customizations = validationResult.processedData?.customizations;
                updatedItemData.basePrice = validationResult.processedData?.basePrice
                updatedItemData.totalPrice = validationResult.processedData?.totalPrice
                updatedItemData.quantity = validationResult.processedData?.quantity
            }
            else{
                const basePrice = parseFloat(items.item_details?.price?.value) || 0;
                const customizationPrice = cartItem.item?.customisationState.length > 0 ? cartItem.item?.customisationState.reduce((sum, c) => sum + (c.price || 0), 0) : 0
                updatedItemData = { ...updatedItemData , quantity : { count: data.quantity}}
                updatedItemData.basePrice = basePrice * data.quantity
                updatedItemData.totalPrice = (basePrice + customizationPrice) * data.quantity
            }
            
            cartItem.item =updatedItemData;
            return  await cartItem.save();
        }
        catch (err) {
            throw err;
        }
    }

    async removeItem(data) {
        try {
            const result =   await CartItem.deleteOne({_id:data.itemId});
            if(result.deletedCount == 0){
                return {
                    status: 404,
                    error:{
                        message: "Cart item not found"
                    }
                }
            }
            return { success: true, message: 'Item removed successfully' };
        }
        catch (err) {
            throw err;
        }
    }

    async clearCart(data) {
        try {
            const cart = await Cart.findOne({userId:data.userId,_id:data.id})

            if (!cart) {
                return {
                    status: 404,
                    error:{
                        message: "Cart not found"
                    }
                }
            }

            await Cart.deleteMany({userId:data.userId,_id:data.id})
            await CartItem.deleteMany({cart:cart._id});

            return { success: true, message: 'Cart cleared successfully' };
        }
        catch (err) {
            throw err;
        }
    }

    async getCartItem(data) {
        try {
            let query = {userId:data.userId};
            if(data.location_id){
                query.location_id=data.location_id
            }else{
                query.location_id = { $exists: false };
            }
            const cart = await Cart.findOne(query);
            if(cart){
                const cartItems = await CartItem.find({cart:cart._id});
                return { cartExists: true, items: cartItems };
            }else{
                return { cartExists: false, items: [] }
            }
        }
        catch (err) {
            throw err;
        }
    }

    async getAllCartItem(data) {
        try {
            let query = { userId: data.userId };

            const cart = await Cart.find(query).lean();
    
            const cartWithItems = await Promise.all(cart.map(async cartItem => {
                if (cartItem) {
                    //get location details
                    if(cartItem.location_id){
                        cartItem.location= await bppSearchService.getLocationDetails({id:cartItem.location_id})
                    }
                    
                    const items = await CartItem.find({ cart: cartItem._id }).lean();
                    return { ...cartItem, items };
                } else {
                    return { ...cartItem, items: [] };
                }
            }));
    
            return cartWithItems;
        }
        catch (err) {
            throw err;
        }
    }

}

export default CartService;