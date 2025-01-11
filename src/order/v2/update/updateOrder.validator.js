import { body , param , query } from "express-validator"
import { RETURN_REASONS } from "../../../utils/cancellation-return-reason"

const updateOrderValidator = {
    update: [
        body()
            .isArray({ min: 1 }).withMessage("Request body must be a non-empty array."),
        body("*.update_target")
            .exists().withMessage("update_target is required.")
            .isString().withMessage("update_target must be a string.")
            .isIn(["item" , "fulfillment" , "billing"]).withMessage("update_target must be 'item'."),
        body("*.order")
            .exists().withMessage("Order is required.")
            .isObject().withMessage("Order must be an object."),
        body("*.order.id")
            .exists().withMessage("Order ID is required.")
            .isString().withMessage("Order ID must be a string."),
        body("*.order.provider.id")
            .exists().withMessage("Provider ID is required.")
            .isString().withMessage("Provider ID must be a string."),
        body("*.order.items")
            .exists().withMessage("Items are required.")
            .isArray({ min: 1 }).withMessage("Items must be a non-empty array."),
        body("*.order.items.*.id")
            .exists().withMessage("Item ID is required.")
            .isString().withMessage("Item ID must be a string."),
        body("*.order.items.*.quantity")
            .exists().withMessage("Quantity is required.")
            .isObject().withMessage("Quantity must be an object."),
        body("*.order.items.*.quantity.count")
            .exists().withMessage("Quantity count is required.")
            .isInt({ min: 1 }).withMessage("Quantity count must be a positive integer."),
        body("*.order.items.*.tags")
            .exists().withMessage("Tags are required.")
            .isObject().withMessage("Tags must be an object."),
        body("*.message.order.items.*.tags.parent_item_id")
            .optional()
            .isString().withMessage("parent_item_id must be a string."),        
        body("*.order.items.*.tags.update_type")
            .exists().withMessage("Update type is required.")
            .isString().withMessage("Update type must be a string.")
            .isIn(["return", "cancel"])
            .withMessage("Invalid update type."),
        body("*.order.items.*.tags.reason_code")
            .exists().withMessage("Reason code is required.")
            .isString().withMessage("Reason code must be a string.")
            .custom((value) => {
                const reason = RETURN_REASONS.find((reason) => reason.key === value);
                if (!reason) {
                    throw new Error('Invalid return reason ID.');
                    }
                    return true;
                }),
        body("*.message.order.items.*.tags.ttl_approval")
            .exists().withMessage("TTL approval is required.")
            .matches(/^P\d+D$/).withMessage("TTL approval must be in ISO 8601 duration format (e.g., P7D)."),
        body("*.message.order.items.*.tags.ttl_reverseqc")
            .exists().withMessage("TTL reverse QC is required.")
            .matches(/^P\d+D$/).withMessage("TTL reverse QC must be in ISO 8601 duration format (e.g., P3D)."),
        body("*.message.order.items.*.tags.image")
            .optional()
            .isString().withMessage("Image must be a string.")
    ]
}

export default updateOrderValidator