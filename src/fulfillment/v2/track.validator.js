import { body } from "express-validator"

const trackValidator = {
    track: [
        body('message')
          .exists()
          .withMessage('Message object is required.')
          .isObject()
          .withMessage('Message must be an object.'),
        body('message.order_id')
          .exists()
          .withMessage('Order ID is required.')
          .isString()
          .withMessage('Order ID must be a string.'),
    ],
    on_track: [
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

export default trackValidator