// src/cart/CartValidator.js
import { getGroupConfig, isVegItem, getChildGroups, getRequiredGroups } from './cartHelpers.js';
import { body , param } from "express-validator"

class CartValidator {
    constructor(groups, items) {
        this.groupsMap = new Map(groups.map(g => [g.local_id || g.id, g]));
        this.itemsMap = new Map(items.map(i => [i.item_details.id, i.item_details]));
    }

    validateAddToCartRequest(cartData , item) {
        const result = { isValid: true, errors: [], processedData: null, totalPrice: 0 };

        // Validate customizations
        if (!this.validateCustomizations(cartData, item, result)) {
            return result;
        }
    
        const processedCustomizations = this.processCustomizations(cartData.customizations || [], result , cartData.quantity);
        const basePrice = parseFloat(item.item_details?.price?.value) || 0;
        const customizationPrice = processedCustomizations.reduce((sum, c) => sum + (c.price || 0), 0);
        const totalPrice = (basePrice + customizationPrice) * cartData.quantity;
        let customizations = []
        cartData.customizations.forEach(c=> customizations.push({...this.itemsMap.get(c.choiceId) , quantity : { count: cartData.quantity }}))

        const processedData = {
            id: cartData.itemId,
            local_id: item?.local_id,
            bpp_id: item?.bpp_details?.bpp_id,
            bpp_uri: item?.context?.bpp_uri,
            domain: item?.context?.domain,
            tags: item?.item_details?.tags,
            contextCity: item?.context?.city,
            quantity: {
                count: cartData.quantity
            },
            provider: {
                locations: item?.locations,
                ...item?.provider_details,
            },
            product:{
                id: item?.id,
                ...item?.item_details
            },
            customizations,
            basePrice: basePrice * cartData.quantity,
            customisationState: processedCustomizations,
            totalPrice: totalPrice,
        };

        result.processedData = processedData;
        result.totalPrice = totalPrice;

        return result;
    }

    processCustomizations(customizations, result , quantity) {
        const processed = [];
        const processedGroups = new Set();

        for (const customization of customizations) {
            const group = this.groupsMap.get(customization.groupId);

            if (!group) {
                result.errors.push(`Invalid group ID: ${customization.groupId}`);
                result.isValid = false;
                continue;
            }

            const item = this.itemsMap.get(customization.choiceId);

            if (!item) {
                result.errors.push(`Invalid customization item ID: ${customization.choiceId}`);
                result.isValid = false;
                continue;
            }

            // if (item?.quantity?.available?.count && quantity > item?.quantity?.available?.count) {
            //     result.errors.push(`Requested quantity exceeds available stock of: ${customization.choiceId}`);
            //     result.isValid = false;
            //     continue;
            // }
            
            // if (item?.quantity?.maximum?.count && quantity > item?.quantity?.maximum?.count) {
            //     result.errors.push(`Maximum quantity allowed is ${item?.quantity?.maximum?.count} for ${customization.choiceId}`);
            //     result.isValid = false;
            //     continue;
            // }
            
            // if (item?.quantity?.minimum?.count && quantity < item?.quantity?.minimum?.count) {
            //     result.errors.push(`Maximum quantity allowed is ${item?.quantity?.maximum?.count} for ${customization.choiceId}`);
            //     result.isValid = false;
            //     continue;
            // }

            const belongsToGroup = item.tags.some(tag => tag.code === "parent" &&
                tag.list.some(list => list.code === "id" && list.value === customization.groupId));

            if (!belongsToGroup) {
                result.errors.push(`Item ${item.descriptor.name} does not belong to group ${group.descriptor.name}`);
                result.isValid = false;
                continue;
            }

            processed.push({
                groupId: customization.groupId,
                groupName: group.descriptor.name,
                choiceId: customization.choiceId,
                name: item.descriptor.name,
                price: parseFloat(item.price.value) || 0,
                isVeg: isVegItem(item)
            });

            // const childGroups = getChildGroups(item);
            // for (const childGroup of childGroups) {
            //     if (!customizations.some(c => c.groupId === childGroup)) {
            //         const childGroupName = this.groupsMap.get(childGroup)?.descriptor?.name || childGroup;
            //         result.errors.push(`Missing required selection for: ${childGroupName}`);
            //         result.isValid = false;
            //     }
            // }
        }

        return processed;
    }

    validateCustomizations(cartData, item, result) {
        const groupCounts = new Map();
        const customizationSet = new Set();
    
        // Validate each customization
        for (const customization of cartData.customizations) {
            if (!this.validateSingleCustomization(customization, groupCounts, customizationSet, result)) {
                result.isValid = false;
                continue;
            }
        }
    
        // Validate group constraints
        if (!this.validateGroupConstraints(groupCounts, item, result)) {
            return false;
        }
    
        return result.isValid;
    }

    /**
    * Validates a single customization
    * @private
    */
    validateSingleCustomization(customization, groupCounts, customizationSet, result) {
        // Check for duplicate selections
        const key = `${customization.groupId}_${customization.choiceId}`;
        if (customizationSet.has(key)) {
            result.errors.push(`Duplicate selection found: ${customization.choiceId} in group ${customization.groupId}`);
            return false;
        }
        customizationSet.add(key);

        // Validate item exists
        const item = this.itemsMap.get(customization.choiceId);
        if (!item) {
            result.errors.push(`Invalid customization item: ${customization.choiceId}`);
            return false;
        }

        // Count selections per group
        groupCounts.set(
            customization.groupId,
            (groupCounts.get(customization.groupId) || 0) + 1
        );

        return true;
    }

    /**
    * Validates group constraints
    * @private
     */
    validateGroupConstraints(groupCounts, item, result) {
        // Check each group's constraints
        for (const [groupId, count] of groupCounts) {
            const group = this.groupsMap.get(groupId);
            if (!group) {
                result.errors.push(`Invalid group ID: ${groupId}`);
                result.isValid = false;
                continue;
            }

            const config = getGroupConfig(group);
            const groupName = group.descriptor?.name || groupId;

            // Validate min/max selections
            if (count < config.min) {
                result.errors.push(
                    `${groupName} requires at least ${config.min} selection${config.min !== 1 ? 's' : ''}`
                );
                result.isValid = false;
            }

            if (count > config.max) {
                result.errors.push(
                    `${groupName} allows maximum ${config.max} selection${config.max !== 1 ? 's' : ''}`
                );
                result.isValid = false;
            }

            // // Add warnings
            // if (config.max > 1 && count === config.max) {
            //     result.warnings.push(`${groupName} has reached maximum allowed selections (${config.max})`);
            // }
        }

        // Check required groups
        const requiredGroups = getRequiredGroups(item.item_details, this.groupsMap);
        for (const groupId of requiredGroups) {
            if (!groupCounts.has(groupId)) {
                const group = this.groupsMap.get(groupId);
                const config = getGroupConfig(group);
                result.errors.push(
                    `${group.descriptor?.name || groupId} requires ${config.min} selection${config.min !== 1 ? 's' : ''}`
                );
                result.isValid = false;
            }
        }

        return result.isValid;
    }
}

export const validateAddItem = [
    body('itemId').notEmpty().withMessage('itemId is required'),
    body('quantity')
        .notEmpty().withMessage('quantity is required')
        .isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
    body('customizations').optional().isArray().withMessage('customizations must be an array'),
    body('customizations.*.groupId')
        .if(body('customizations').exists())
        .notEmpty().withMessage('groupId is required in each customization'),
    body('customizations.*.choiceId')
        .if(body('customizations').exists())
        .notEmpty().withMessage('choiceId is required in each customization'),
    body('customizations').custom((customizations, { req }) => {
            if (!customizations) return true;
            
            const seen = new Set();
    
            for (const cust of customizations) {
                // Check for duplicates
                const key = `${cust.groupId}_${cust.choiceId}`;
                if (seen.has(key)) {
                    throw new Error(`Duplicate selection found: ${cust.choiceId} in group ${cust.groupId}`);
                }
                seen.add(key);
            }

            return true;
        })
]

export const validateUpdateItemCart = [
    body('itemId').notEmpty().withMessage('itemId is required'),
    body('quantity')
        .notEmpty().withMessage('quantity is required')
        .isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
    body('customizations').optional().isArray().withMessage('customizations must be an array'),
    body('customizations.*.groupId')
        .if(body('customizations').exists())
        .notEmpty().withMessage('groupId is required in each customization'),
    body('customizations.*.choiceId')
        .if(body('customizations').exists())
        .notEmpty().withMessage('choiceId is required in each customization'),
    body('customizations').custom((customizations, { req }) => {
            if (!customizations) return true;
            
            const seen = new Set();
    
            for (const cust of customizations) {
                // Check for duplicates
                const key = `${cust.groupId}_${cust.choiceId}`;
                if (seen.has(key)) {
                    throw new Error(`Duplicate selection found: ${cust.choiceId} in group ${cust.groupId}`);
                }
                seen.add(key);
            }

            return true;
        }),
    param('itemId')
        .isMongoId()
        .withMessage('Invalid cartItemId: must be a valid ObjectId'),
]

export const validateRemoveItem = [
    param('itemId')
    .isMongoId()
    .withMessage('Invalid cartItemId: must be a valid ObjectId'),
]

export const validateClearCart = [
    param('id')
    .isMongoId()
    .withMessage('Invalid cartId: must be a valid ObjectId'),
]

export default CartValidator;





