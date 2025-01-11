import {Router} from 'express';
import { authentication } from '../middlewares/index.js';

import UserController from './user.controller.js';
import userValidator from './user.validator.js';

const rootRouter = new Router();
const userController = new UserController();

rootRouter.post( 
    '/v1/auth/apple', 
    userController.signInWithApple,
);

rootRouter.post( // 
    '/v1/auth/google', 
    userController.authenticateWithGoogle,
);

rootRouter.post( //
    '/v1/auth/mobile', 
    userValidator.mobileAuth,
    userController.authPhone,
);

rootRouter.post( //
    '/v1/auth/verify-otp', 
    userValidator.authVerify, 
    userController.authVerify
);

rootRouter.patch( //
    '/v1/user/phone', 
    authentication(),
    userValidator.phoneUpdate,
    userController.initiatePhoneUpdate,
);

rootRouter.post( //
    '/v1/user/phone/verify', 
    authentication(),
    userValidator.verifyPhoneVerification,
    userController.verifyPhoneVerification,
);

rootRouter.get( //
    '/v1/user', 
    authentication(),
    userController.getDetails,
);

rootRouter.patch(
    '/v1/user', 
    authentication(),
    userValidator.updateDetails,
    userController.updateDetails,
);

rootRouter.delete(
    "/v1/user",
    authentication(),
    userController.deleteAccount
)

rootRouter.patch( //
    '/v1/user/fcm-token', 
    authentication(),
    userValidator.updateFcmToken,
    userController.updateFcmToken,
);


rootRouter.post(
    "/v1/user/invite",
    userValidator.inviteForm,
    userController.inviteForm
)

rootRouter.post(
    "/v1/user/invite/check",
    userValidator.checkInviteUser,
    userController.checkInviteUser
)

rootRouter.post(
    "/v1/user/invite/validate",
    userValidator.validateInviteCode,
    userController.validateCode
)

rootRouter.post(
    "/v1/user/invite/resend",
    userValidator.resendInviteCode,
    userController.resendCode
)


export default rootRouter;
