import {validationResult} from "express-validator"
import BadRequestParameterError from '../lib/errors/bad-request-parameter.error.js';
import UserService from './user.service.js';
import UnauthenticatedError from "../lib/errors/unauthenticated.error.js";
import messagesModule from '../utils/messages.js';

// Access the MESSAGES object
const { MESSAGES } = messagesModule;
const userService = new UserService();

class UserController {

    sanitizeHeader(value) {
        return value ? String(value).slice(0, 100) : null;
    }

    authPhone(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }

        const { body: request  } = req;
        userService.authWithPhone(request).then(response => {
            res.status(201).json(response);
        }).catch((err) => {
            console.log("Error in register", err);
            next(err);
        });
    }

    authVerify(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        const { body: request } = req;
        userService.authWithPhoneVerify(request).then(response => {
            res.status(200).json(response);
        }).catch((err) => {
            console.log("Error in login", err);
            next(err);
        });
    }

    authenticateWithGoogle(req, res, next) {
        const authHeader = req.headers.authorization;
    
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_NO_TOKEN));
        }

        const token = authHeader.split(' ')[1];

        if(!token) return next( new UnauthenticatedError(MESSAGES.LOGIN_ERROR_NO_TOKEN) );

        const { body: request   } = req;
        userService.authWithGoogle(request, token).then(response => {
            res.status(200).json(response);
        }).catch((err) => {
            next(err);
        });
    }

    signInWithApple(req,res,next) {
        const authHeader = req.headers.authorization;
    
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_NO_TOKEN));
        }

        const token = authHeader.split(' ')[1];

        if(!token) return next(new UnauthenticatedError(MESSAGES.LOGIN_ERROR_NO_TOKEN));

        const { body: request   } = req;
        userService.authWithApple(request, token ).then(response => {
            res.status(200).json(response);
        }).catch((err) => {
            console.log("Failed to apple sign", err)
            next(err);
        });
    }

    initiatePhoneVerify(req,res,next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        const { body: request , user } = req;
        userService.initiatePhoneUpdate(request , user).then(response => {
            res.status(200).json(response);
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
            res.status(200).json(response);
        }).catch((err) => {
            next(err);
        });
    }

    getDetails(req,res,next) {
        const { body: request , user } = req;
        userService.currentUser(request , user).then(response => {
            res.status(200).json(response);
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
            res.status(200).json(response);
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
            model: headers['x-device-model'],
            osVersion: headers['x-os-version'],
            appVersion: headers['x-app-version']
        }
        userService.updateFcmToken(request, deviceInfo, user).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }

    deleteAccount(req,res,next){
        const {body:request , user} = req
        userService.removeAccount(request , user).then(response=>{
            res.status(200).json(response)
        }).catch((err)=>{
            next(err)
        })
    }
    
    inviteForm(req , res , next){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }

        const { body: request } = req
        userService.inviteForm(request).then((response)=>{
            res.status(200).json(response)
        })
        .catch((err)=>next(err))
    }

    checkInviteUser(req , res , next){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }

        const { body: request } = req;
        userService.checkInvitedUser(request).then(response=>{
            res.status(200).json(response)
        })
        .catch(err=> next(err))
    }

    validateCode(req , res , next){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        
        const { body: request } = req;
        userService.validateCode(request).then(response=>{
            res.status(200).json(response)
        })
        .catch(err=> next(err))
    }

    resendCode(req , res , next){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        
        const { body: request } = req;
        userService.resendCode(request).then(response=>{
            res.status(200).json(response)
        })
        .catch(err=> next(err))
    }

}

export default UserController;
