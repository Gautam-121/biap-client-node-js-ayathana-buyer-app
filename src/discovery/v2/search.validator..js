import { query } from "express-validator";
import { domainEnum } from "../../lib/errors/errors.js";



const discovery = {
    search : [
        query('latitude')
            .exists().withMessage('Latitude is required')
            .trim()
            .toFloat().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
        query('longitude')
            .exists().withMessage('Longitude is required')
            .trim()
            .toFloat().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
        query("pageNumber")
            .optional()
            .isInt({ min: 1 }).withMessage("Page number must be an integer greater than 0"),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })  // Add max limit
            .withMessage('Limit must be between 1 and 100'),
        query("priceMin")
            .optional()
            .isFloat({ min: 0 }).withMessage("Minimum price must be a positive number"),
        query("priceMax")
            .optional()
            .isFloat({ min: 0 }).withMessage("Maximum price must be a positive number.")
            .custom((value, { req }) => {
                if (req.query.priceMin && parseFloat(value) < parseFloat(req.query.priceMin)) {
                    throw new Error("Maximum price must be greater than or equal to minimum price.");
                }
                return true;
            }),
    
        query("rating")
            .optional()
            .matches(/^\d(\.\d{1})?$/).withMessage("Rating must be a single digit or a decimal with one digit after the point (e.g., 1, 2, 4.5).")
            .custom((value) => {
                const numericValue = parseFloat(value);
                if (numericValue < 0 || numericValue > 5) {
                    throw new Error("Rating must be between 0 and 5.");
                }
                return true;
            }),
    
        query("providerIds")
            .optional()
            .isString().withMessage("Provider IDs must be valid UUIDs"),
    
        query("categoryIds")
            .optional()
            .isString().withMessage("Category IDs must be a string"),
    
        query("name")
            .optional()
            .isString()
            .trim()
            .isLength({ min: 1, max: 100 })
            .matches(/^[\p{L}\p{N}\s\-_']+$/u)
            .withMessage("Name can contain letters, numbers, spaces, and basic punctuation"),
    
        query("sortField")
            .optional()
            .isIn(['quantity', 'price' , 'rating']).withMessage("Sort field must be either 'quantity', 'price' or 'rating"), // Enforce enum validation
    
        query("sortOrder")
            .optional()
            .isIn(['asc', 'desc']).withMessage("Sort order must be either 'asc' or 'desc'")
    ],
    provider: [
        query('latitude')
            .exists().withMessage('Latitude is required')
            .trim()
            .toFloat().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
        query('longitude')
            .exists().withMessage('Longitude is required')
            .trim()
            .toFloat().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })  // Add max limit
            .withMessage('Limit must be between 1 and 100'),
        query('domain')
            .optional()
            .isString().withMessage('Domain must be a string')
            .isIn(domainEnum)
            .withMessage(`Context domain must be one of the following values: ${domainEnum.join(', ')}`),
        query("name")
            .optional()
            .isString()
            .trim()
            .isLength({ min: 1, max: 100 })
            .matches(/^[\p{L}\p{N}\s\-_']+$/u)
            .withMessage("Name can contain letters, numbers, spaces, and basic punctuation"),

        // Add afterKey validation if needed
        query('afterKey')
            .optional()
            .isString()
            .withMessage('Invalid pagination key')
    ],
    providerDetails: [
        query('providerId')
          .exists().withMessage('providerId is required')
          .isString().withMessage('providerId must be a string'),
        query('locationId')
          .exists().withMessage('locationId is required')
          .isString().withMessage('locationId must be a string'),
      ],
    attributes: [
        query("pageNumber")
            .optional()
            .isInt({ min: 1 }).withMessage("Page number must be an integer greater than 0"),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })  // Add max limit
            .withMessage('Limit must be between 1 and 100'),
    ],
    attributesValues: [
        query("attribute_code")
            .exists().withMessage('attribute code is required'),

        query("category")
            .optional()
            .isString().withMessage("Category must be string"),

        query("providerId")
            .optional()
            .isString().withMessage("ProviderId must be string"),
    ]
} 

export default discovery


