import { body , param , query } from "express-validator"
import { RETURN_REASONS } from "../../../utils/cancellation-return-reason.js"

const updateOrderValidator = {
    update: [
        body()
            .isArray({ min: 1 }).withMessage("Request body must be a non-empty array."),
        body("*.id")
            .exists().withMessage("Order ID is required.")
            .isString().withMessage("Order ID must be a string."),
        body("*.items")
            .exists().withMessage("Items are required.")
            .isArray({ min: 1 }).withMessage("Items must be a non-empty array."),
        body("*.items.*.id")
            .exists().withMessage("Item ID is required.")
            .isString().withMessage("Item ID must be a string."),
        body("*.items.*.quantity")
            .exists().withMessage("Quantity is required.")
            .isInt({ min: 1 }).withMessage("Quantity count must be a positive integer."),
        body("*.items.*.tags")
            .exists().withMessage("Tags are required.")
            .isObject().withMessage("Tags must be an object."),
        body("*.items.*.tags.parent_item_id")
            .optional()
            .isString().withMessage("parent_item_id must be a string."),        
        body("*.items.*.tags.reason_code")
            .exists().withMessage("Reason code is required.")
            .isString().withMessage("Reason code must be a string.")
            .custom((value) => {
                const reason = RETURN_REASONS.find((reason) => reason.key === value);
                if (!reason) {
                    throw new Error('Invalid return reason ID.');
                    }
                    return true;
                }),
        body('*.items.*.tags.image')
            .isString().withMessage('Image must be a string.')
            .isURL().withMessage('Image must be a valid URL.')
            .custom((value) => {
                const allowedExtensions = ['.jpg', '.jpeg', '.png'];
                const extension = value.substring(value.lastIndexOf('.'));
                if (!allowedExtensions.includes(extension)) {
                    throw new Error('Image URL must end with .jpg, .jpeg, or .png');
                }
                return true;
            })
    ]
}

export default updateOrderValidator