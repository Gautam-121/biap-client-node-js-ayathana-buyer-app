// import { UnauthenticatedError } from '../lib/errors/index.js';
// import validateToken from '../lib/firebase/validateToken.js';
// import messagesModule from '../utils/messages.js';

// //Access the MESSAGES object
// const { MESSAGES } = messagesModule;

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
import UserMongooseModel from '../user/db/user.js';
import AdminMongooseModel from '../admin/db/admin.js'
import messagesModule from '../utils/messages.js';

// Access the MESSAGES object
const { MESSAGES } = messagesModule;

const authentication = (options) => async (req, res, next) => {

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_NO_TOKEN));
    }

    const token = authHeader.split(' ')[1];

    if(!token) return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_NO_TOKEN));
    
    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_access_token_secret');
        req.user = { decodedToken: decoded.decodedToken , token };

        // Get user ID from token
        const userId = decoded?.decodedToken?.uid;

        // Find user
        const user = decoded.decodedToken.role == "ADMIN" ? await AdminMongooseModel.findById(userId) : await UserMongooseModel.findById(userId)

        // const user =  await UserMongooseModel.findById(userId)

        if (!user) {
            return next(new UnauthenticatedError("Invalid token or user not found"));
        }

        next()

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