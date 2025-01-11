import {body} from "express-validator"

const statusValidator = {
    status: [
        body()
          .isArray({ min: 1 })
          .withMessage('Input must be an array with at least one object.'),
        body('*.message')
          .exists()
          .withMessage('Each object must contain a "message" field.')
          .isObject()
          .withMessage('The "message" field must be an object.'),
        body('*.message.order_id')
          .exists()
          .withMessage('Each "message" object must contain an "order_id" field.')
          .isString()
          .withMessage('Order ID must be a string.')
    ],
    on_status: [
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
}

export default statusValidator