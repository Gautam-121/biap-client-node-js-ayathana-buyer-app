import { body , param , check } from "express-validator"

const user =  {
    mobileAuth : [
        body('phone')
            .trim()
            .notEmpty().withMessage('Phone is required')
            .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian mobile number')
            .isMobilePhone(["en-IN"]).withMessage('Valid Indian phone number is required'),
    ],
    authVerify : [
        body('phone')
            .trim()
            .notEmpty().withMessage('Phone is required')
            .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian mobile number')
            .isMobilePhone(["en-IN"]).withMessage('Valid Indian phone number is required'),
        body('otp')
            .notEmpty().withMessage('OTP is required')
            .isString().withMessage('OTP must be a string')
    ],
    phoneUpdate:[
        body('phone')
            .trim()
            .notEmpty().withMessage('Phone is required')
            .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian mobile number')
            .isMobilePhone(["en-IN"]).withMessage('Valid Indian phone number is required')
    ],
    updateDetails: [
        check().custom((_, { req }) => {
            if (!req.body.name && !req.body.email && !req.body.phone && !req.body.gender) {
                throw new Error('At least one field (name , email , phone , gender) must be provided');
            }
            return true;
        }),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters'),
        body('email')
            .optional()
            .trim()
            .isEmail()
            .withMessage('must be valid email'),
        body('phone')
            .optional()
            .trim()
            .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian mobile number')
            .isMobilePhone(["en-IN"]).withMessage('Valid Indian phone number is required'),
        body('gender')
            .optional()
            .isIn(['male', 'female', 'other'])
            .withMessage('Gender must be one of the following values: male, female, or other')
    ],
    verifyPhoneVerification: [
       body('otp').notEmpty().withMessage('OTP is required').isString().withMessage('OTP must be a string'),
       body('phone')
            .trim()
            .notEmpty().withMessage('Phone is required')
            .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian mobile number')
            .isMobilePhone(["en-IN"]).withMessage('Valid Indian phone number is required')
    ],
    updatePassword: [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').notEmpty().withMessage('password is required').isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        }).withMessage('Password must be strong: at least 8 characters long, include an uppercase letter, a lowercase letter, a digit, and a special character'),
        body('confirmPassword').notEmpty().withMessage('Confirm password is required')
    ],
    updateFcmToken: [
        body('fcmToken').notEmpty().withMessage('FCM token is required').isString().withMessage('FCM token must be a string'),
        body('fcmToken')
            .optional()
            .isString().withMessage('FCM token must be a string')
            .custom((value, { req }) => {
                if (value && (!req.headers['x-device-model'] || !req.headers['x-os-version'] || !req.headers['x-app-version'])) {
                    throw new Error('If FCM token is provided, deviceInfo (headers) must be included');
                }
                return true;
            })
    ],
    inviteForm: [
        body('name')
            .trim()
            .notEmpty().withMessage('name is required')
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters'),
        body('email')
            .trim()
            .notEmpty().withMessage('email is required')
            .isEmail()
            .withMessage('must be valid email')
    ],
    checkInviteUser: [
        body('email')
            .trim()
            .notEmpty().withMessage('email is required')
            .isEmail()
            .withMessage('must be valid email'),
    ],
    validateInviteCode: [
        body('email')
            .trim()
            .notEmpty().withMessage('email is required')
            .isEmail()
            .withMessage('must be valid email'),
        body('inviteCode')
            .isLength({ min: 6 }) // Minimum length considering 8 chars + timestamp
            .withMessage("Invite code must be 16 character long")
            .isAlphanumeric()
            .withMessage('Invalid invite code format. It should be alphanumeric and of correct length.'),
    ],
    resendInviteCode: [
        body('email')
            .trim()
            .notEmpty().withMessage('email is required')
            .isEmail()
            .withMessage('must be valid email'),
    ]
    
}

export default user