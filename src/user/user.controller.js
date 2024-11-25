import {validationResult} from "express-validator"
import BadRequestParameterError from '../lib/errors/bad-request-parameter.error.js';
import UserService from './user.service.js';
const userService = new UserService();

class UserController {

    create(req, res, next) {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }

        const { body: request , headers } = req;
        const deviceInfo = {
            type: headers['x-device-type'] || null,
            model: headers['x-device-model'] || null,
            osVersion: headers['x-os-version'] || null,
            appVersion: headers['x-app-version'] || null
        }

        userService.register(request, deviceInfo).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    login(req, res, next) {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }

        const { body: request , headers  } = req;
        const deviceInfo = {
            type: headers['x-device-type'] || null,
            model: headers['x-device-model'] || null,
            osVersion: headers['x-os-version'] || null,
            appVersion: headers['x-app-version'] || null
        }

        userService.login(request,deviceInfo).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    authenticateWithGoogle(req, res, next) {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }

        const { body: request , headers  } = req;
        const deviceInfo = {
            type: headers['x-device-type'] || null,
            model: headers['x-device-model'] || null,
            osVersion: headers['x-os-version'] || null,
            appVersion: headers['x-app-version'] || null
        }

        userService.authenticateWithGoogle(request,deviceInfo).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    signInWithApple(req,res,next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }

        const { body: request , headers  } = req;
        const deviceInfo = {
            type: headers['x-device-type'] || null,
            model: headers['x-device-model'] || null,
            osVersion: headers['x-os-version'] || null,
            appVersion: headers['x-app-version'] || null
        }
        userService.signInWithApple(request, deviceInfo).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    sendVerificationEmail(req,res,next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        const { body: request } = req;
        userService.sendVerificationEmail(request).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    verifyEmail(req,res,next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        const { body: request } = req;
        userService.verifyEmail(request).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    forgotPassword(req,res,next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        const { body: request } = req;
        userService.forgotPassword(request).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    resetPassword(req,res,next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        const { body: request } = req;
        userService.resetPassword(request).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    getDetails(req,res,next) {
        const { body: request , user } = req;
        userService.currentUser(request , user).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    updateDetails(req,res,next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        const { body: request , user } = req;
        userService.updateDetails(request , user).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    initiatePhoneUpdate(req,res,next) {
        const { body: request , user } = req;
        userService.initiatePhoneUpdate(request , user).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    verifyPhoneVerification(req,res,next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        const { body: request , user } = req;
        userService.verifyPhoneVerification(request , user).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    updatePassword(req,res,next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        const { body: request , user } = req;
        userService.updatePassword(request , user).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    updateFcmToken(req,res,next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        const { body: request , headers , user } = req;
        const deviceInfo = {
            type: headers['x-device-type'] || null,
            model: headers['x-device-model'] || null,
            osVersion: headers['x-os-version'] || null,
            appVersion: headers['x-app-version'] || null
        }
        userService.updateFcmToken(request, deviceInfo, user).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

}

export default UserController;
