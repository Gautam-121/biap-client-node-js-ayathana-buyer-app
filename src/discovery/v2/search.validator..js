import { query } from "express-validator";

const discovery = {
    search : [
        query("latitude")
            .exists().withMessage("Latitude is required")
            .isFloat({ min: -90, max: 90 }).withMessage("Latitude must be a valid coordinate between -90 and 90"),
            
        query("longitude")
            .exists().withMessage("Longitude is required")
            .isFloat({ min: -180, max: 180 }).withMessage("Longitude must be a valid coordinate between -180 and 180"),
        
        query("pageNumber")
            .optional()
            .isInt({ min: 1 }).withMessage("Page number must be an integer greater than 0"),
    
        query("limit")
            .optional()
            .isInt({ min: 1 }).withMessage("Limit must be an integer greater than 0"),
    
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
            .isString().withMessage("Name must be a valid string.")
            .trim()
            .matches(/^[a-zA-Z0-9\s]+$/).withMessage("Name must contain only letters, numbers, and spaces."),
    
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
          .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be a valid latitude value between -90 and 90'),
        query('longitude')
          .exists().withMessage('Longitude is required')
          .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be a valid longitude value between -180 and 180'),
        query('limit')
          .optional()
          .isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
        query('domain')
          .optional()
          .isString().withMessage('Domain must be a string'),
        query("name")
          .optional()
          .isString().withMessage("Name must be a valid string.")
          .trim()
          .matches(/^[a-zA-Z0-9\s]+$/).withMessage("Name must contain only letters, numbers, and spaces."),
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

        query("limit")
            .optional()
            .isInt({ min: 1 }).withMessage("Limit must be an integer greater than 0"),
    ],
    attributesValues: [
        query("attribute_code")
            .optional()
            .isInt({ min: 1 }).withMessage("Page number must be an integer greater than 0"),

        query("limit")
            .optional()
            .isInt({ min: 1 }).withMessage("Limit must be an integer greater than 0"),
    ]
} 

export default discovery


