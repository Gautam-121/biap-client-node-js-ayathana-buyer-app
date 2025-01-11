import { body , query , param} from "express-validator"
import { domainEnum } from "../lib/errors/errors.js";

const validateConfirmRequest = {
    confirm_payment :  [
        param("merchantTransactionId")
            .exists()
            .withMessage('The "merchantTransactionId" is required.'),

        // Validate that confirmRequest is an array with at least one object
        body('confirmRequest')
            .isArray({ min: 1 })
            .withMessage('confirmRequest must be a non-empty array'),
    
        // Validate each object in the confirmRequest array
        body('confirmRequest.*.context.domain')
            .notEmpty().withMessage('Domain is required')
            .isString().withMessage('Domain must be a string')
            .isIn(domainEnum)
            .withMessage(`domain must be one of the following values: ${domainEnum.join(', ')}`),
    
        body('confirmRequest.*.context.city')
            .notEmpty().withMessage('City is required')
            .isString().withMessage('City must be a string'),
    
        body('confirmRequest.*.context.transactionId')
            .notEmpty().withMessage('Transaction ID is required')
            .isUUID().withMessage("Transaction ID must be a valid UUID"),
    
        // Validate payment fields
        body('confirmRequest.*.message.payment.paid_amount')
            .notEmpty().withMessage('Paid amount is required')
            .matches(/^[+-]?([0-9]*[.])?[0-9]+$/).withMessage('Paid amount must be a decimal value'),
    
        body('confirmRequest.*.message.payment.type')
            .notEmpty().withMessage('Payment type is required')
            .isIn(["ON-ORDER", "PRE-FULFILLMENT", "ON-FULFILLMENT", "POST-FULFILLMENT"])
            .isString().withMessage('Payment type must be one of: ON-ORDER, PRE-FULFILLMENT, ON-FULFILLMENT, POST-FULFILLMENT'),
    
        body('confirmRequest.*.message.payment.status')
            .notEmpty().withMessage('Payment status is required')
            .isIn(["PAID" , "NOT-PAID"])
            .isString().withMessage('Payment status must be a string'),
    
        // Validate ONDC specific fields
        body('confirmRequest.*.message.payment["@ondc/org/settlement_basis"]')
            .notEmpty().withMessage('Settlement basis is required')
            .isIn(['shipment', 'delivery', 'return_window_expiry'])
            .withMessage('Settlement basis must be one of: shipment, delivery, return_window_expiry'),
    
        body('confirmRequest.*.message.payment["@ondc/org/settlement_window"]')
            .notEmpty().withMessage('Settlement window is required')
            .isString().withMessage('Settlement window must be a string')
            .matches(/^P\d+D$/).withMessage("@ondc/org/settlement_window must be in ISO 8601 duration format (e.g., P7D)."),

    
        body('confirmRequest.*.message.payment["@ondc/org/withholding_amount"]')
            .notEmpty().withMessage('Withholding amount is required')
            .matches(/^[+-]?([0-9]*[.])?[0-9]+$/)
            .withMessage('Withholding amount must be a decimal value'),
        
        // Validate providers fields
        body('confirmRequest.*.message.providers.id')
            .notEmpty().withMessage('Provider ID is required')
            .isString().withMessage('Provider ID must be a string'),
    ],
    initializePayment: [
        param("orderTransactionId")
            .exists()
            .withMessage('The "orderTransactionId" is required.')
            .isUUID()
            .withMessage("orderTransactionId must be a valid UUID"),

        body('amount')
            .exists()
            .withMessage('Amount is required.')
            .isNumeric()
            .withMessage('Amount must be a valid number.'),
    ]
}

export default validateConfirmRequest