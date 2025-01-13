import { body , param } from "express-validator"

const delivery =  {
    deliveryAddress: [
        // Descriptor validations
        body('descriptor')
            .exists().withMessage('Descriptor is required and must be an object'),
        body('descriptor.name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
            .matches(/^(?!\d)[a-zA-Z0-9]+$/).withMessage('Name must not start with a number and should contain alphanumeric characters')
            .custom(value => {
              if (/^\d+$/.test(value)) {
                throw new Error('Name should not be only numbers');
              }
              return true;
        }),
        body('descriptor.phone')
            .exists().withMessage('Phone is required')
            .isString().withMessage("Phone number must be a string")
            .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian mobile number')
            .isMobilePhone('en-IN').withMessage('Valid Indian phone number is required'),
        body('descriptor.email')
            .exists().withMessage('Email is required')
            .isEmail().withMessage('Must be valid email'),
    
        // Address validations
        body('address')
            .exists().withMessage('Address is required and must be an object'),
        body('address.areaCode')
            .exists().notEmpty().withMessage('Area code is required')
            .isString().withMessage("Area code must be a string")
            .isLength({ min: 6, max: 6 }).withMessage('Area code must be 6 characters long')
            .isNumeric().withMessage('Area code must be numeric')
            .matches(/^[1-9][0-9]{5}$/).withMessage('Area code must be a valid 6-digit Indian postal code'),
        body('address.door') // optional
            .optional()
            .trim()
            .isString().withMessage("Door must be a string"),
        body('address.building') // optional
            .optional()
            .trim()
            .isString().withMessage("Building must be a string"),
        body('address.street')
            .trim()
            .exists().withMessage('Street is required')
            .isString().withMessage("Street must be a string"),
        body('address.city')
            .trim()
            .notEmpty().withMessage('City is required')
            .isString().withMessage("City must be a string")
            .isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters')
            .matches(/^(?!\d)[a-zA-Z0-9]+$/).withMessage('City must not start with a number and should contain alphanumeric characters')
            .custom(value => {
              if (/^\d+$/.test(value)) {
                throw new Error('City should not be only numbers');
              }
              return true;
        }),
        body('address.state')
            .trim()
            .notEmpty().withMessage('State is required')
            .isString().withMessage("State must be a string")
            .isLength({ min: 2, max: 50 }).withMessage('State must be between 2 and 50 characters')
            .matches(/^(?!\d)[a-zA-Z0-9]+$/).withMessage('State must not start with a number and should contain alphanumeric characters')
            .custom(value => {
                if (/^\d+$/.test(value)) {
                    throw new Error('State should not be only numbers');
                }
            return true;
        }),
        body('address.tag')
            .exists().withMessage('Tag is required')
            .isIn(['Home', 'Office', 'Others']).withMessage('Tag must be either "Home", "Office", or "Others"'),
        body('address.country')
            .exists().withMessage('Country is required')
            .isIn(['IND']).withMessage('Country code must be a valid 3-character country code (e.g., IND)'),
        body('address.lat')
            .exists().withMessage('Latitude is required')
            .trim()
            .toFloat().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90')
            .custom(value => {
                if (value === 0) throw new Error('Latitude cannot be zero');
                return true;
            }),
        body('address.lng')
            .exists().withMessage('Longitude is required')
            .trim()
            .toFloat().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180')
            .custom(value => {
                if (value === 0) throw new Error('Longitude cannot be zero');
                return true;
            }),
    ],
    updateDeliveryAddress : [
        // Descriptor validations
        body('descriptor')
            .exists().withMessage('Descriptor is required and must be an object'),
        body('descriptor.name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
            .matches(/^(?!\d)[a-zA-Z0-9]+$/).withMessage('Name must not start with a number and should contain alphanumeric characters')
            .custom(value => {
              if (/^\d+$/.test(value)) {
                throw new Error('Name should not be only numbers');
              }
              return true;
        }),
        body('descriptor.phone')
            .exists().withMessage('Phone is required')
            .isString().withMessage("Phone number must be a string")
            .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian mobile number')
            .isMobilePhone('en-IN').withMessage('Valid Indian phone number is required'),
        body('descriptor.email')
            .exists().withMessage('Email is required')
            .isEmail().withMessage('Must be valid email'),
    
        // Address validations
        body('address')
            .exists().withMessage('Address is required and must be an object'),
        body('address.areaCode')
            .exists().notEmpty().withMessage('Area code is required')
            .isString().withMessage("Area code must be a string")
            .isLength({ min: 6, max: 6 }).withMessage('Area code must be 6 characters long')
            .isNumeric().withMessage('Area code must be numeric')
            .matches(/^[1-9][0-9]{5}$/).withMessage('Area code must be a valid 6-digit Indian postal code'),
        body('address.door') // optional
            .optional()
            .trim()
            .isString().withMessage("Door must be a string"),
        body('address.building') // optional
            .optional()
            .trim()
            .isString().withMessage("Building must be a string"),
        body('address.street')
            .trim()
            .exists().withMessage('Street is required')
            .isString().withMessage("Street must be a string"),
        body('address.city')
            .trim()
            .notEmpty().withMessage('City is required')
            .isString().withMessage("City must be a string")
            .isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters')
            .matches(/^(?!\d)[a-zA-Z0-9]+$/).withMessage('City must not start with a number and should contain alphanumeric characters')
            .custom(value => {
              if (/^\d+$/.test(value)) {
                throw new Error('City should not be only numbers');
              }
              return true;
        }),
        body('address.state')
            .trim()
            .notEmpty().withMessage('State is required')
            .isString().withMessage("State must be a string")
            .isLength({ min: 2, max: 50 }).withMessage('State must be between 2 and 50 characters')
            .matches(/^(?!\d)[a-zA-Z0-9]+$/).withMessage('State must not start with a number and should contain alphanumeric characters')
            .custom(value => {
                if (/^\d+$/.test(value)) {
                    throw new Error('State should not be only numbers');
                }
            return true;
        }),
        body('address.tag')
            .exists().withMessage('Tag is required')
            .isIn(['Home', 'Office', 'Others']).withMessage('Tag must be either "Home", "Office", or "Others"'),
        body('address.country')
            .exists().withMessage('Country is required')
            .isIn(['IND']).withMessage('Country code must be a valid 3-character country code (e.g., IND)'),
        body('address.lat')
            .exists().withMessage('Latitude is required')
            .trim()
            .toFloat().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90')
            .custom(value => {
                if (value === 0) throw new Error('Latitude cannot be zero');
                return true;
        }),
        body('address.lng')
            .exists().withMessage('Longitude is required')
            .trim()
            .toFloat().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180')
            .custom(value => {
                if (value === 0) throw new Error('Longitude cannot be zero');
                return true;
        }),
        body('defaultAddress')
            .optional()
            .isBoolean().withMessage('Default address must be a boolean'),
        param("id")
            .isUUID().withMessage("must be valid uuid")
    ],
    deleteDeliveryAddress : [
        param("id")
            .isUUID().withMessage("must be valid uuid")
    ]
}

export default delivery