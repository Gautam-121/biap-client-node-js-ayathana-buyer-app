import { body, query } from "express-validator";
import { domainEnum } from "../../../lib/errors/errors.js";
import { validate as uuidValidate } from 'uuid';

// Regular expression for validating GPS coordinates (latitude,longitude)
const gpsRegex = /^-?(90(\.0+)?|[1-8]?\d(\.\d+)?),\s*-?(180(\.0+)?|1[0-7]\d(\.\d+)?|\d{1,2}(\.\d+)?)$/;

const initValidator = {
    init: [
        // Context Validations
        body('*.context.transaction_id')
            .exists().withMessage("Transaction ID is required")
            .isUUID().withMessage("Transaction ID must be a valid UUID"),
        
        body('*.context.city')
            .exists().withMessage("City code is required")
            .isString().withMessage("City code must be a string"),
        
        body('*.context.domain')
            .isString()
            .withMessage('Context domain must be a string')
            .isIn(domainEnum)
            .withMessage(`Context domain must be one of the following values: ${domainEnum.join(', ')}`),
    
        // Message -> Items Validations
        body('*.message.items').isArray({ min: 1 }).withMessage("Items must be an array with at least one item"),
    
        body('*.message.items.*.itemId')
            .exists().withMessage("Item ID is required for each item")
            .isString().withMessage("Item ID must be a string"),
    
        body('*.message.items.*.quantity')
            .exists().withMessage("Quantity is required for each item")
            .isInt({ min: 1 }).withMessage("Quantity must be an integer greater than 0"),
    
        // Optional customizations validation
        body('*.message.items.*.customizations')
            .optional()
            .isArray()
            .withMessage('Customizations must be an array'),
    
        body('*.message.items.*.customizations.*.groupId')
            .if(body('*.message.items.*.customizations').exists())
            .isString()
            .withMessage('Each customization must have a valid groupId'),
    
        body('*.message.items.*.customizations.*.choiceId')
            .if(body('*.message.items.*.customizations').exists())
            .isString()
            .withMessage('Each customization must have a valid choiceId'),
    
        // Custom validation for duplicate customizations in each item
        body('*.message.items.*.customizations').custom((customizations) => {
            if (!customizations) return true;
    
            const seen = new Set();
            for (const cust of customizations) {
                const key = `${cust.groupId}_${cust.choiceId}`;
                if (seen.has(key)) {
                    throw new Error(`Duplicate selection found: choiceId ${cust.choiceId} in group ${cust.groupId}`);
                }
                seen.add(key);
            }
            return true;
        }),
    
        // Message -> Fulfillments Validations
        body('*.message.fulfillments').isArray({ min: 1 }).withMessage("Fulfillments must be an array with at least one fulfillment"),
        body('*.message.fulfillments.*.id')
            .exists().withMessage("Fulfillment ID is required"),
    
        body('*.message.fulfillments.*.type')
            .exists().withMessage("Fulfillment type is required")
            .isIn(['Delivery', 'Self-Pickup']).withMessage("Fulfillment type must be one of 'Delivery' or 'Self-Pickup'"),
    
        // Message -> Billing Info Validations
        body('*.message.billing_info').exists().withMessage("Billing information is required"),
        body('*.message.billing_info.address').exists().withMessage("Billing address is required"),
    
        body('*.message.billing_info.address.door')
            .optional().isString().withMessage("Billing door must be a string"),

        body('*.message.billing_info.address.building')
            .optional().isString().withMessage("Billing building must be a string"),

        body('*.message.billing_info.address.street')
            .exists().withMessage("Billing street is required")
            .isString().withMessage("Billing street must be a string"),

        body('*.message.billing_info.address.city')
            .exists().withMessage("Billing city is required")
            .isString().withMessage("Billing city must be a string"),

        body('*.message.billing_info.address.state')
            .exists().withMessage("Billing state is required")
            .isString().withMessage("Billing state must be a string"),

        body('*.message.billing_info.address.country')
            .exists().withMessage("Billing country is required")
            .isString().withMessage("Billing country must be a string"),

        body('*.message.billing_info.address.areaCode')
            .exists().withMessage("Billing area code is required")
            .isString().withMessage("Billing area code must be a string"),

        body('*.message.billing_info.address.tag')
            .exists().withMessage("Billing address tag is required")
            .isIn(['Home', 'Office', 'Others']).withMessage("Tag must be one of 'Home', 'Office', or 'Others'"),

        body('*.message.billing_info.address.lat')
            .optional()
            .isFloat({ min: -90, max: 90 }).withMessage('Billing latitude must be between -90 and 90'),

        body('*.message.billing_info.address.lng')
            .optional()
            .isFloat({ min: -180, max: 180 }).withMessage("Billing longitude must be between -180 and 180"),
        
        body('*.message.billing_info.phone')
            .exists().withMessage("Billing phone number is required")
            .isMobilePhone('en-IN').withMessage('Billing phone must be a valid phone number'),

        body('*.message.billing_info.name')
            .exists().withMessage("Billing name is required")
            .isString().withMessage("Billing name must be a string"),

        body('*.message.billing_info.email')
            .exists().withMessage("Billing email is required")
            .isEmail().withMessage("Billing email must be a valid email"),
    
        // Message -> Delivery Info Validations
        body('*.message.delivery_info').exists().withMessage("Delivery information is required"),

        body('*.message.delivery_info.type')
            .exists().withMessage("Delivery type is required")
            .isIn(['Delivery', 'Self-Pickup']).withMessage("Fulfillment type must be one of 'Delivery' or 'Self-Pickup'"),

        body('*.message.delivery_info.name')
            .exists().withMessage("Delivery name is required")
            .isString().withMessage("Delivery name must be a string"),

        body('*.message.delivery_info.email')
            .exists().withMessage("Delivery email is required")
            .isEmail().withMessage("Delivery email must be a valid email"),

        body('*.message.delivery_info.phone')
            .exists().withMessage("Delivery phone number is required")
            .isMobilePhone('en-IN').withMessage("Delivery phone must be a valid phone number"),

        body('*.message.delivery_info.location').exists().withMessage("Delivery location is required"),

        body('*.message.delivery_info.location.gps')
            .isString()
            .withMessage('Fulfillment location GPS must be a string')
            .matches(gpsRegex)
            .withMessage('Fulfillment location GPS must be a valid latitude,longitude format'),

        body('*.message.delivery_info.location.address').exists().withMessage("Delivery address is required"),
        
        body('*.message.delivery_info.location.address.door')
            .optional().isString().withMessage("Delivery door must be a string"),

        body('*.message.delivery_info.location.address.building')
            .optional().isString().withMessage("Delivery building must be a string"),

        body('*.message.delivery_info.location.address.street')
            .exists().withMessage("Delivery street is required")
            .isString().withMessage("Delivery street must be a string"),

        body('*.message.delivery_info.location.address.city')
            .exists().withMessage("Delivery city is required")
            .isString().withMessage("Delivery city must be a string"),

        body('*.message.delivery_info.location.address.state')
            .exists().withMessage("Delivery state is required")
            .isString().withMessage("Delivery state must be a string"),

        body('*.message.delivery_info.location.address.country')
            .exists().withMessage("Delivery country is required")
            .isString().withMessage("Delivery country must be a string"),

        body('*.message.delivery_info.location.address.areaCode')
            .exists().withMessage("Delivery area code is required")
            .isString().withMessage("Delivery area code must be a string"),

        body('*.message.delivery_info.location.address.tag')
            .exists().withMessage("Delivery address tag is required")
            .isIn(['Home', 'Office', 'Others']).withMessage("Tag must be one of 'Home', 'Office', or 'Others'"),
        
        // Message -> Payment Validations
        body('*.message.payment.type')
            .exists().withMessage("Payment type is required")
            .isIn(['ON-ORDER', 'FULFILLMENT']).withMessage("Payment type must be one of 'ON-ORDER' or 'FULFILLMENT'"),

    ],
    on_init: [
      // Validate the `messageIds` query parameter
      query('messageIds')
        .exists()
        .withMessage('The "messageIds" query parameter is required.')
        .notEmpty()
        .withMessage('The "messageIds" query parameter cannot be empty.')
        .custom((value) => {
            if (!value) return false;
            
            const ids = value.split(',').map(id => id.trim());
            
            // Validate basic constraints
            if (ids.length === 0) {
                throw new Error('At least one message ID is required');
            }
            
            if (ids.length > 50) {
                throw new Error('Too many message IDs. Maximum allowed is 50.');
            }
            
            // Validate UUID format
            const invalidIds = ids.filter(id => !uuidValidate(id));
            if (invalidIds.length > 0) {
                throw new Error(`Invalid UUID format in messageIds: ${invalidIds.join(', ')}`);
            }
            
            // Check for duplicates
            if (new Set(ids).size !== ids.length) {
                throw new Error('Duplicate message IDs are not allowed');
            }

            return true;
        }),
    ],
    inits: [
        // Context Validations
        body('*.context.transaction_id')
            .exists().withMessage("Transaction ID is required")
            .isUUID().withMessage("Transaction ID must be a valid UUID"),
        
        body('*.context.city')
            .exists().withMessage("City code is required")
            .isString().withMessage("City code must be a string"),
        
        body('*.context.domain')
            .isString()
            .withMessage('Context domain must be a string')
            .isIn(domainEnum)
            .withMessage(`Context domain must be one of the following values: ${domainEnum.join(', ')}`),
    
        // Message -> Items Validations
        body('*.message.items').isArray({ min: 1 }).withMessage("Items must be an array with at least one item"),
    
        body('*.message.items.*.itemId')
            .exists().withMessage("Item ID is required for each item")
            .isString().withMessage("Item ID must be a string"),
    
        body('*.message.items.*.quantity')
            .exists().withMessage("Quantity is required for each item")
            .isInt({ min: 1 }).withMessage("Quantity must be an integer greater than 0"),
    
        // Optional customizations validation
        body('*.message.items.*.customizations')
            .optional()
            .isArray()
            .withMessage('Customizations must be an array'),
    
        body('*.message.items.*.customizations.*.groupId')
            .if(body('*.message.items.*.customizations').exists())
            .isString()
            .withMessage('Each customization must have a valid groupId'),
    
        body('*.message.items.*.customizations.*.choiceId')
            .if(body('*.message.items.*.customizations').exists())
            .isString()
            .withMessage('Each customization must have a valid choiceId'),
    
        // Custom validation for duplicate customizations in each item
        body('*.message.items.*.customizations').custom((customizations) => {
            if (!customizations) return true;
    
            const seen = new Set();
            for (const cust of customizations) {
                const key = `${cust.groupId}_${cust.choiceId}`;
                if (seen.has(key)) {
                    throw new Error(`Duplicate selection found: choiceId ${cust.choiceId} in group ${cust.groupId}`);
                }
                seen.add(key);
            }
            return true;
        }),
    
        // Message -> Fulfillments Validations
        body('*.message.fulfillments').isArray({ min: 1 }).withMessage("Fulfillments must be an array with at least one fulfillment"),
        body('*.message.fulfillments.*.id')
            .exists().withMessage("Fulfillment ID is required"),
    
        body('*.message.fulfillments.*.type')
            .exists().withMessage("Fulfillment type is required")
            .isIn(['Delivery', 'Self-Pickup']).withMessage("Fulfillment type must be one of 'Delivery' or 'Self-Pickup'"),

        body('*.message.delivery_info.*.id')
            .exists().withMessage("Delivery ID is required")
            .isUUID().withMessage("Delivery ID must be a valid UUID"),
        
        body('*.message.payment.type')
            .exists().withMessage("Payment type is required")
            .isIn(['ON-ORDER', 'FULFILLMENT']).withMessage("Payment type must be one of 'ON-ORDER' or 'FULFILLMENT'"),


    ],
};

export default initValidator;
