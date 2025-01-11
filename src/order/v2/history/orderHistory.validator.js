import { body , param , query} from "express-validator"

const orderHistory = {
    orderList: [
        query("limit")
            .optional()
            .isInt({ min: 1 })
            .withMessage("Limit must be a positive integer."),
        
        query("pageNumber")
            .optional()
            .isInt({ min: 1 })
            .withMessage("Page number must be a positive integer."),

        query("state")
            .optional()
            .isIn(["Created", "Accepted", "In-progress", "Completed", "Cancelled"])
            .withMessage("State must be one of the following values: Created, Accepted, In-progress, Completed, or Cancelled.")
       
    ],
    orderDetails: [
        param("orderId")
            .exists()
            .withMessage('Order ID is required.')
    ]
}

export default orderHistory