import Cart from '../../db/cart.js'
import CartItem from '../../db/items.js'
import mongoose from "mongoose"
import SearchService from "../../../../discovery/v2/search.service.js";
import CartValidator from './cart.validator.js';
import NoRecordFoundError from '../../../../lib/errors/no-record-found.error.js';
import validateQuantity from '../../../../utils/quantity.validator.js';
import BadRequestParameterError from '../../../../lib/errors/bad-request-parameter.error.js';
const bppSearchService = new SearchService();
class CartService {


    async addItem(data) {
        const session = await mongoose.startSession(); // Start a new session
        try {
            session.startTransaction(); // Begin the transaction

            let items = await bppSearchService.getItemDetails({ id: data.itemId }).session(session);
            if (!items) {
                throw new NoRecordFoundError(`Item not found with id: ${data.itemId}`);
            }

            const checkQuantity = validateQuantity(items, data);
            if (checkQuantity?.status === 400) {
                throw new BadRequestParameterError(checkQuantity?.error?.message);
            }

            if (
                items?.customisation_groups.length === 0 &&
                items?.customisation_items?.length === 0 &&
                data.customizations?.length > 0
            ) {
                throw new BadRequestParameterError('No customization available for item');
            }

            let validationResult = null;
            if (items?.customisation_groups.length !== 0 && items?.customisation_items?.length !== 0) {
                const validator = new CartValidator(items.customisation_groups, items.customisation_items);
                validationResult = validator.validateAddToCartRequest(data, items);
            }

            if (validationResult !== null && !validationResult.isValid) {
                throw new BadRequestParameterError(validationResult.errors?.[0]);
            }

            let cart = await Cart.findOne({ userId: data.userId, location_id: data.location_details?.id }).session(session);

            const processedData = {
                id: data.itemId,
                local_id: items?.local_id,
                bpp_id: items?.bpp_details?.bpp_id,
                bpp_uri: items?.context?.bpp_uri,
                domain: items?.context?.domain,
                tags: items?.item_details?.tags,
                contextCity: items?.context?.city,
                quantity: {
                    count: data.quantity,
                },
                provider: {
                    id: items?.provider_details?.id,
                    local_id: items?.provider_details?.local_id,
                    locations: items?.locations,
                    ...items?.provider_details,
                },
                product: {
                    id: items?.id,
                    ...items?.item_details,
                },
                customizations: null,
                customisationState: [],
                basePrice: (parseFloat(items.item_details?.price?.value) || 0) * data.quantity,
                totalPrice: (parseFloat(items.item_details?.price?.value) || 0) * data.quantity,
                userId: data.userId,
            };

            let processingData = validationResult ? { ...validationResult.processedData, userId: data.userId } : processedData;

            if (cart) {
                // Check if the item with the same customizations already exists
                let existingCartItem = await CartItem.findOne({
                    cart: cart._id,
                    "item.id": data.itemId,
                }).session(session);

                // Normal item without customization
                if (existingCartItem && items?.customisation_groups.length === 0 && items?.customisation_items?.length === 0) {
                    throw new BadRequestParameterError('Item in cart already exists. Please update it instead');
                }

                // Add the item to the cart
                let cartItem = new CartItem();
                cartItem.cart = cart._id;
                cartItem.item = processingData;
                cartItem.location_id = data.location_details?.id;
                await cartItem.save({ session }); // Save within the transaction
            } else {
                // Create a new cart
                let newCart = await new Cart({ userId: data.userId, location_id: data.location_details?.id }).save({ session });

                // Add the item to the cart
                let cartItem = new CartItem();
                cartItem.cart = newCart._id;
                cartItem.location_id = data.location_details?.id;
                cartItem.item = processingData;
                await cartItem.save({ session }); // Save within the transaction
            }

            await session.commitTransaction(); // Commit the transaction
            session.endSession(); // End the session
            return { success: true, message: 'Item added to cart successfully' };
        } catch (err) {
            await session.abortTransaction(); // Abort the transaction on error
            session.endSession(); // End the session

            if (err instanceof NoRecordFoundError || err instanceof BadRequestParameterError) {
                throw err;
            }
            throw err;
        }
    }

    async updateItem(data) {
        const session = await mongoose.startSession(); // Start a new session
        try {
            session.startTransaction(); // Begin the transaction

            // Fetch item details within the transaction
            let items = await bppSearchService.getItemDetails({ id: data.itemId }).session(session);
            if (!items) {
                throw new NoRecordFoundError(`Item not found with id: ${data.itemId}`);
            }

            // Validate quantity
            const checkQuantity = validateQuantity(items, data);
            if (checkQuantity?.status === 400) {
                throw new BadRequestParameterError(checkQuantity?.error?.message);
            }

            // Check if customizations are allowed
            if (
                items?.customisation_groups.length === 0 &&
                items?.customisation_items?.length === 0 &&
                data.customizations?.length > 0
            ) {
                throw new BadRequestParameterError('No customization available for this item');
            }

            // Find the cart item within the transaction
            let cartItem = await CartItem.findOne({ _id: data.cartItemId }).session(session);
            if (!cartItem) {
                throw new BadRequestParameterError("Cart item not found");
            }

            // Check if customizations have changed
            let cartCustomData = Array.isArray(cartItem.item?.customisationState)
                ? cartItem.item.customisationState.map(custom => ({ groupId: custom.groupId, choiceId: custom.choiceId }))
                : [];
            let hasCustomisations = Array.isArray(items.customisation_groups) &&
                items.customisation_groups.length > 0 &&
                Array.isArray(items.customisation_items) &&
                items.customisation_items.length > 0;

            let customizationsChanged = true;
            if (cartCustomData.length !== data.customizations.length) {
                customizationsChanged = false;
            } else {
                customizationsChanged = cartCustomData.every(existing =>
                    data.customizations.some(newCust =>
                        existing.groupId === newCust.groupId &&
                        existing.choiceId === newCust.choiceId
                    )
                );
            }

            // Validate customizations if they have changed
            let validationResult = null;
            if (hasCustomisations && !customizationsChanged) {
                const validator = new CartValidator(items.customisation_groups, items.customisation_items);
                validationResult = validator.validateAddToCartRequest(data, items);
            }
            if (validationResult !== null && !validationResult.isValid) {
                throw new BadRequestParameterError(validationResult.errors?.[0]);
            }

            // Prepare updated item data
            let updatedItemData = { ...cartItem.item };
            if (validationResult?.processedData) {
                updatedItemData.customisationState = validationResult.processedData.customisationState;
                updatedItemData.customizations = validationResult.processedData?.customizations;
                updatedItemData.basePrice = validationResult.processedData?.basePrice;
                updatedItemData.totalPrice = validationResult.processedData?.totalPrice;
                updatedItemData.quantity = validationResult.processedData?.quantity;
            } else {
                const basePrice = parseFloat(items.item_details?.price?.value) || 0;
                const customizationPrice = Array.isArray(cartItem.item?.customisationState)
                    ? cartItem.item.customisationState.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0)
                    : 0;

                updatedItemData = {
                    ...updatedItemData,
                    quantity: { count: data.quantity },
                    basePrice: basePrice * data.quantity,
                    totalPrice: (basePrice + customizationPrice) * data.quantity,
                };
            }

            // Update the cart item within the transaction
            cartItem.item = updatedItemData;
            await cartItem.save({ session });

            await session.commitTransaction(); // Commit the transaction
            session.endSession(); // End the session
            return { success: true, message: 'Cart item updated successfully' };
        } catch (err) {
            await session.abortTransaction(); // Abort the transaction on error
            session.endSession(); // End the session

            if (err instanceof NoRecordFoundError || err instanceof BadRequestParameterError) {
                throw err;
            }
            throw err;
        }
    }

    async removeItem(data) {
        try {
            const result =   await CartItem.deleteOne({_id:data.itemId});
            if(result.deletedCount == 0){
                throw new NoRecordFoundError("Cart item not found")
            }
            return { success: true, message: 'Item removed successfully' };
        }
        catch (err) {
            if(err instanceof NoRecordFoundError) throw err
            throw err;
        }
    }

    async clearCart(data) {
        const session = await mongoose.startSession(); // Start a new session
        try {
            session.startTransaction(); // Begin the transaction
    
            // Find the cart within the transaction
            const cart = await Cart.findOne({ userId: data.userId, _id: data.id }).session(session);
            if (!cart) {
                throw new BadRequestParameterError("Cart not found");
            }
    
            // Delete the cart and its associated cart items within the transaction
            await Cart.deleteMany({ userId: data.userId, _id: data.id }).session(session);
            await CartItem.deleteMany({ cart: cart._id }).session(session);
    
            await session.commitTransaction(); // Commit the transaction
            session.endSession(); // End the session
            return { success: true, message: 'Cart cleared successfully' };
        } catch (err) {
            await session.abortTransaction(); // Abort the transaction on error
            session.endSession(); // End the session
    
            if (err instanceof BadRequestParameterError) {
                throw err;
            }
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

    async getCartItemMapToShop(data) {
        try {
            let query = {userId:data.userId};
            if(data.location_id){
                query.location_id=data.location_id
            }else{
                query.location_id = { $exists: false };
            }
            // Find the cart
            const cart = await Cart.findOne(query);
            if (!cart) {
                return { cartExists: false, items: {} }; // Return an empty object for consistency
            }

            // Find cart items
            const cartItems = await CartItem.find({ cart: cart._id });
            if (cartItems.length === 0) {
                return { cartExists: true, items: {} }; // Return an empty object for consistency
            }

            // Group cart items by provider ID and local ID
            const map = new Map();

            for (const cartData of cartItems) {
                const providerId = cartData?.item?.provider?.id;
                const localId = cartData?.item?.local_id;
    
                // Skip invalid cart items
                if (!providerId || !localId) {
                    console.warn("Invalid cart item found:", cartData);
                    continue;
                }
    
                // Initialize or update the map
                if (map.has(providerId)) {
                    const providerData = map.get(providerId);
                    if (providerData[localId]) {
                        providerData[localId].push(cartData);
                    } else {
                        providerData[localId] = [cartData];
                    }
                    map.set(providerId, providerData);
                } else {
                    map.set(providerId, { [localId]: [cartData] });
                }
            }
    
            // Convert the Map to an object for consistent return format
            return { cartExists: true, items: Object.fromEntries(map) };
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