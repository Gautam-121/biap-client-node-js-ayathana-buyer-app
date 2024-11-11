import { body , param } from "express-validator"

const billing =  {
    billingAddress : [
        body('name').notEmpty().withMessage('Name is required').isString().withMessage("Name must be a string"),
        body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone number is required').isString().withMessage("phone number be a string"),
        body('email').isEmail().withMessage('must be valid email'),
        body('address.areaCode').notEmpty().withMessage('Area code is required').isString().withMessage("Area code must be a string").isLength({ min: 6, max: 6 }).withMessage('Area code must be 6 characters long').isNumeric().withMessage('Area code must be numeric').matches(/^[1-9][0-9]{5}$/).withMessage('Area code must be a valid 6-digit Indian postal code'),
        body('address.door').optional().isString().withMessage("Door must be a string"),
        body('address.building').optional().isString().withMessage("Building must be a string"),
        body('address.street').notEmpty().withMessage('Street is required').isString().withMessage("Street must be a string"),
        body('address.city').notEmpty().withMessage('City is required').isString().withMessage("City must be a string"),
        body('address.state').notEmpty().withMessage('State is required').isString().withMessage("State must be a string"),
        body('address.tag').isIn(['Home', 'Office', 'Others']).withMessage('Tag must be either "Home", "Office", or "Others"'),
        body('address.country').isIn(['IND']).withMessage('Country code must be a valid 3-character country code (e.g., IND )'),
        body('address.lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
        body('address.lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude  must be between -180 and 180'),
    ],
    updateBillingAddress : [
        body('name').notEmpty().withMessage('Name is required').isString().withMessage("Name must be a string"),
        body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone number is required').isString().withMessage("phone number be a string"),
        body('email').isEmail().withMessage('must be valid email'),
        body('address.areaCode').notEmpty().withMessage('Area code is required').isString().withMessage("Area code must be a string").isLength({ min: 6, max: 6 }).withMessage('Area code must be 6 characters long').isNumeric().withMessage('Area code must be numeric').matches(/^[1-9][0-9]{5}$/).withMessage('Area code must be a valid 6-digit Indian postal code'),
        body('address.door').optional().isString().withMessage("Door must be a string"),
        body('address.building').optional().isString().withMessage("Building must be a string"),
        body('address.street').notEmpty().withMessage('Street is required').isString().withMessage("Street must be a string"),
        body('address.city').notEmpty().withMessage('City is required').isString().withMessage("City must be a string"),
        body('address.state').notEmpty().withMessage('State is required').isString().withMessage("State must be a string"),
        body('address.tag').isIn(['Home', 'Office', 'Others']).withMessage('Tag must be either "Home", "Office", or "Others"'),
        body('address.country').isIn(['IND']).withMessage('Country code must be a valid 3-character country code (e.g., IND )'),
        body('address.lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
        body('address.lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    
        param("id").isUUID().withMessage("must be valid uuid")
    ]
}

export default billing