import { body, query} from "express-validator";
import { domainEnum } from "../../../lib/errors/errors.js";
import { validate as uuidValidate } from 'uuid';

// Regular expression for validating GPS coordinates (latitude,longitude)
const gpsRegex = /^-?(90(\.0+)?|[1-8]?\d(\.\d+)?),\s*-?(180(\.0+)?|1[0-7]\d(\.\d+)?|\d{1,2}(\.\d+)?)$/;

const selectValidator = {
    select: [
        // Validate context domain
        body('*.context.domain')
            .isString()
            .withMessage('Context domain must be a string')
            .isIn(domainEnum)
            .withMessage(`Context domain must be one of the following values: ${domainEnum.join(', ')}`),

        body('*.context.city')
            .isString()
            .withMessage('Context city must be a string'),

        // Validate items in the message.cart.items array
        body('*.message.cart.items')
            .isArray({min:1})
            .withMessage('Items must be an array with at least one item'),

        body('*.message.cart.items.*.itemId')
            .exists().withMessage("Item ID is required for each item")
            .isString().withMessage('Each item must have a valid itemId'),

        body('*.message.cart.items.*.quantity')
            .exists().withMessage("Quantity is required for each item")
            .isInt({ min: 1 })
            .withMessage('Quantity must be an integer greater than 0'),

        // Optional customizations validation
        body('*.message.cart.items.*.customizations')
            .optional()
            .isArray()
            .withMessage('Customizations must be an array with at least one customization'),

        body('*.message.cart.items.*.customizations.*.groupId')
            .if(body('*.message.cart.items.*.customizations').exists())
            .isString()
            .withMessage('Each customization must have a valid groupId'),

        body('*.message.cart.items.*.customizations.*.choiceId')
            .if(body('*.message.cart.items.*.customizations').exists())
            .isString()
            .withMessage('Each customization must have a valid choiceId'),
          
        // Custom validation for duplicate customizations in each item
        body('*.message.cart.items.*.customizations').custom((customizations, { req, path }) => {
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

        body('*.message.cart.offers')
            .optional()
            .isArray({min:1})
            .withMessage('Offers must be an array with at least one offer'),

        // Validate fulfillments array
        body('*.message.fulfillments')
            .isArray({min:1})
            .withMessage('Fulfillments must be an array with at least one fulfillment'),

        // GPS validation
        body('*.message.fulfillments.*.end.location.gps')
            .isString()
            .withMessage('Fulfillment location GPS must be a string')
            .matches(gpsRegex)
            .withMessage('Fulfillment location GPS must be a valid latitude,longitude format'),

        // Custom pincode validation for Indian pincodes
        body('*.message.fulfillments.*.end.location.address.area_code')
            .isString()
            .withMessage('Fulfillment address area_code must be a string')
            .custom((value) => /^\d{6}$/.test(value))
            .withMessage('Fulfillment address area_code must be a valid 6-digit Indian pincode'),
        
    ],
    on_select: [
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
    ]
};

export default selectValidator;
