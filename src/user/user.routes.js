import {Router} from 'express';
import { authentication } from '../middlewares/index.js';

import UserController from './user.controller.js';
import userValidator from './user.validator.js';

const rootRouter = new Router();
const userController = new UserController();

rootRouter.post(
    '/v1/signup', 
    userValidator.register,
    userController.create,
);

rootRouter.post(
    '/v1/signin', 
    userValidator.login, 
    userController.login
);

rootRouter.post(
    '/v1/email/send', 
    userValidator.sendVerificationEmail,
    userController.sendVerificationEmail,
);

rootRouter.post(
    '/v1/email/verify', 
    userValidator.verifyEmail,
    userController.verifyEmail,
);

rootRouter.post(
    '/v1/forgot-password', 
    userValidator.forgotPassword,
    userController.forgotPassword,
);

rootRouter.post(
    '/v1/reset-password', 
    userValidator.resetPassword,
    userController.resetPassword,
);

rootRouter.post(
    '/v1/signin/apple', 
    userValidator.signInWithApple,
    userController.signInWithApple,
);

rootRouter.post(
    '/v1/signin/google', 
    userValidator.authenticateWithGoogle,
    userController.authenticateWithGoogle,
);

rootRouter.get(
    '/v1/user', 
    authentication(),
    userController.getDetails,
);

rootRouter.put(
    '/v1/user', 
    authentication(),
    userValidator.updateDetails,
    userController.updateDetails,
);

rootRouter.post(
    '/v1/user/phone', 
    authentication(),
    userValidator.initiatePhoneUpdate,
    userController.initiatePhoneUpdate,
);

rootRouter.post(
    '/v1/user/phone/verify', 
    authentication(),
    userValidator.verifyPhoneVerification,
    userController.verifyPhoneVerification,
);

rootRouter.put(
    '/v1/user/password', 
    authentication(),
    userValidator.updatePassword,
    userController.updatePassword,
);

rootRouter.put(
    '/v1/user/fcm-token', 
    authentication(),
    userValidator.updateFcmToken,
    userController.updateFcmToken,
);


export default rootRouter;
