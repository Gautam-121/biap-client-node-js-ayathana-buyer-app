// import { UnauthenticatedError } from '../lib/errors/index.js';
// import validateToken from '../lib/firebase/validateToken.js';
// import MESSAGES from '../utils/messages.js';

// const authentication =  (options) => (req, res, next) => {
//     const authHeader = req.headers.authorization;
//     if (authHeader) {
//         const idToken = authHeader.split(" ")[1];
//         validateToken(idToken).then(decodedToken => {
//             if (decodedToken) {
//                 req.user = { decodedToken: decodedToken, token: idToken };
//                 next();
//             } 
//             else {
//                 next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_USER_ACCESS_TOKEN_INVALID));
//             }
//         })
//     }
//     else {
//         next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_USER_ACCESS_TOKEN_INVALID));
//     }
// };


import { UnauthenticatedError } from '../lib/errors/index.js';
import jwt from 'jsonwebtoken';
import MESSAGES from '../utils/messages.js';

const authentication = (options) => async (req, res, next) => {

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_NO_TOKEN));
    }

    const token = authHeader.split(' ')[1];

    if(!token) return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_NO_TOKEN));
    
    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_access_token_secret');
        req.user = { decodedToken: decoded, token };

        // Get user ID from token
        const userId = decoded.uid;

        // Find user
        const user = await UserMongooseModel.findById(userId);

        if (!user) {
            return next(new ErrorHandler("Invalid token or user not found", 401));
        }

        if(user.isEmailVerified) {
            next();
        } else {
            return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_EMAIL_NOT_VERIFIED));
        }

    } catch (error) {

        if (error instanceof jwt.TokenExpiredError) {
            return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_TOKEN_EXPIRED));
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_INVALID_TOKEN));
        }
        if (error instanceof jwt.NotBeforeError) {
            return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_TOKEN_NOT_ACTIVE));
        }
        // For any other unexpected errors
        return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_TOKEN_GENERIC));
    }
};

export default authentication;