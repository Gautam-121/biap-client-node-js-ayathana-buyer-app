import { body , query } from "express-validator"
import { CANCELATION_REASONS } from "../../../utils/cancellation-return-reason.js";


const cancelValidator = {
    cancel: [
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
        body('message.cancellation_reason_id')
          .exists()
          .withMessage('Cancellation reason ID is required.')
          .isString()
          .withMessage('Cancellation reason ID must be a string.')
          .custom((value) => {
            const reason = CANCELATION_REASONS.find((reason) => reason.key === value);
            if (!reason) {
              throw new Error('Invalid cancellation reason ID.');
            }
            return true;
          }),
    ],
    on_cancel: [
        // Validate the `messageIds` query parameter
        query('messageId')
          .exists()
          .withMessage('The "messageIds" query parameter is required.')
          .notEmpty()
          .withMessage('The "messageIds" query parameter cannot be empty.')
  ]
}


export default cancelValidator