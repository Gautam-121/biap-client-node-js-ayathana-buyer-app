import { body , param } from "express-validator"

const user =  {
    register : [
        body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
        body('phone').trim().notEmpty().withMessage('Phone is required').isMobilePhone(["en-IN"]).withMessage('Valid Indian phone number is required'),
        body('email').trim().isEmail().withMessage('must be valid email'),
        body('password').notEmpty().withMessage('Password is required').isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        }).withMessage('Password must be strong: at least 8 characters long, include an uppercase letter, a lowercase letter, a digit, and a special character'),
        body('fcmToken')
            .optional()
            .isString().withMessage('FCM token must be a string')
            .custom((value, { req }) => {
                // If fcmToken is provided, check if deviceInfo is in the headers
                if (value && (!req.headers['x-device-type'] || !req.headers['x-device-model'] || !req.headers['x-os-version'] || !req.headers['x-app-version'])) {
                    throw new Error('If FCM token is provided, deviceInfo (headers) must be included');
                }
                return true;
            })
    ],
    login : [
        body('email').notEmpty().withMessage('Email is required').trim().isEmail().withMessage('must be valid email'),
        body('password').notEmpty().withMessage('Password is required').isString().withMessage('Password must be a string'),
        body('fcmToken')
            .optional()
            .isString().withMessage('FCM token must be a string')
            .custom((value, { req }) => {
                // If fcmToken is provided, check if deviceInfo is in the headers
                if (value && (!req.headers['x-device-type'] || !req.headers['x-device-model'] || !req.headers['x-os-version'] || !req.headers['x-app-version'])) {
                    throw new Error('If FCM token is provided, deviceInfo (headers) must be included');
                }
                return true;
            })
    ],
    authenticateWithGoogle : [
        body('token').notEmpty().withMessage('Id token is required'),
        body('fcmToken')
            .optional()
            .isString().withMessage('FCM token must be a string')
            .custom((value, { req }) => {
                if (value && (!req.headers['x-device-type'] || !req.headers['x-device-model'] || !req.headers['x-os-version'] || !req.headers['x-app-version'])) {
                    throw new Error('If FCM token is provided, deviceInfo (headers) must be included');
                }
                return true;
            })
    ],
    sendVerificationEmail: [
        body('email').notEmpty().withMessage('Email is required').trim().isEmail().withMessage('must be valid email')
    ],
    verifyEmail: [
        body('email').notEmpty().withMessage('Email is required').trim().isEmail().withMessage('must be valid email'),
        body('otp').notEmpty().withMessage('OTP is required').isString().withMessage('OTP must be a string')
    ],
    forgotPassword: [
        body('email').notEmpty().withMessage('Email is required').trim().isEmail().withMessage('must be valid email')
    ],
    resetPassword: [
        body('email').notEmpty().withMessage('Email is required').trim().isEmail().withMessage('must be valid email'),
        body('otp').notEmpty().withMessage('OTP is required'),
        body('newPassword').notEmpty().withMessage('New password is required').isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        }).withMessage('Password must be strong: at least 8 characters long, include an uppercase letter, a lowercase letter, a digit, and a special character'),
    ],
    updateDetails: [
        body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
        body('phone').optional().trim().isMobilePhone(["en-IN"]).withMessage('Valid Indian phone number is required')
    ],
    verifyPhoneVerification: [
       body('otp').notEmpty().withMessage('OTP is required').isString().withMessage('OTP must be a string')
    ],
    updatePassword: [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').notEmpty().withMessage('New password is required').isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        }).withMessage('Password must be strong: at least 8 characters long, include an uppercase letter, a lowercase letter, a digit, and a special character'),
        body('confirmPassword').notEmpty().withMessage('Confirm password is required')
    ],
    signInWithApple: [
        body('identityToken').notEmpty().withMessage('Apple identity token is required'),
        body('fcmToken')
            .optional()
            .isString().withMessage('FCM token must be a string')
            .custom((value, { req }) => {
                if (value && (!req.headers['x-device-type'] || !req.headers['x-device-model'] || !req.headers['x-os-version'] || !req.headers['x-app-version'])) {
                    throw new Error('If FCM token is provided, deviceInfo (headers) must be included');
                }
                return true;
            }),
    ],
    updateFcmToken: [
        body('fcmToken').notEmpty().withMessage('FCM token is required').isString().withMessage('FCM token must be a string'),
        body('fcmToken')
            .optional()
            .isString().withMessage('FCM token must be a string')
            .custom((value, { req }) => {
                if (value && (!req.headers['x-device-type'] || !req.headers['x-device-model'] || !req.headers['x-os-version'] || !req.headers['x-app-version'])) {
                    throw new Error('If FCM token is provided, deviceInfo (headers) must be included');
                }
                return true;
            })
    ]
}

export default user