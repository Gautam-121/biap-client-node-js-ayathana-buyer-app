import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ConflictError from '../lib/errors/conflict.error.js';
import UserMongooseModel from './db/user.js';
import NoRecordFoundError from '../lib/errors/no-record-found.error.js';
import BadRequestParameterError from '../lib/errors/bad-request-parameter.error.js';
import { NOTIFICATION_CHANNELS } from '../utils/constants.js';
import EmailService from '../utils/email/email.service.js';
import UnauthenticatedError from '../lib/errors/unauthenticated.error.js';
import UnauthorisedError from '../lib/errors/unauthorised.error.js';
import { createPublicKey } from "crypto"
import mongoose from "mongoose"
import DeliveryAddressMongooseModel from '../accounts/deliveryAddress/db/deliveryAddress.js';
import Interest from './db/interest.js';
import Cart from '../order/v2/db/cart.js'
import CartItem from '../order/v2/db/items.js'
import OTP from './db/otp.js';

const emailService = new EmailService();

class UserService {
    constructor() {
        this.KALEYRA_SID = process.env.KALEYRA_SID || 'HXAP1693668585IN';
        this.KALEYRA_API_KEY = process.env.KALEYRA_API_KEY || 'A9519e83851564e6223ed07308f90c7a3';
        this.KALEYRA_URL = process.env.KALEYRA_URL || 'https://api.kaleyra.io/v1';
        this.KALEYRA_FLOW_ID = process.env.KALEYRA_FLOW_ID || 'ff5b5f2c-7099-4678-abb0-737f1602fc09';
        this.SENDER_ID = process.env.SENDER_ID || "KLRHXA"
        this.JWT_SECRET = process.env.JWT_SECRET || 'your_access_token_secret';
        this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
        this.APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || 'your_apple_client_id';
        this.APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || 'your_apple_team_id';
        this.APPLE_KEY_ID = process.env.APPLE_KEY_ID || 'your_apple_key_id';
        this.APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY || 'your_apple_private_key'; // Your private key from Apple
        this.MAX_TOKENS_PER_USER = process.env.MAX_TOKENS_PER_USER || 5;
    }

    // Helper Methods
    sanitizeUser(user) {
        const userObject = user.toObject();
        delete userObject?.password;
        delete userObject?.pendingPhone
        delete userObject?.isEmailVerified
        delete userObject?.fcmTokens;
        delete userObject?.providerId
        delete userObject?.verifyId
        delete userObject?.resetPasswordId
        delete userObject?.smsOtp
        delete userObject?.smsOtpExpire
        delete userObject?.resetPasswordOTP
        delete userObject?.resetPasswordExpires
        delete userObject?.lastPasswordResetAttempt
        delete userObject?.passwordResetAttempts
        delete userObject?.blockedUntil
        delete userObject?.lastVerificationAttempt
        delete userObject?.canRecover
        delete userObject?.recoveryToken
        delete userObject?.recoveryTokenExpires
        delete userObject?.deletedAt
        delete userObject?.isFirstLogin
        delete userObject?.["__v"]

        return userObject;
    }

    generateInviteCode() {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const length = 8; // Length of the random part of the invite code
        let code = "";
    
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            code += charset[randomIndex];
        }
    
        // Append a timestamp for additional uniqueness
        const timestamp = Date.now().toString(36); // Convert to base-36
        return `${code}${timestamp}`;
    }

    // Add this helper method for sending emails with kaleyra api
    async sendOtp(phone, user, isResend = false) {
        try {
            // Check for rate limiting
            // if (user.verifyId && isResend) {
            //     const RATE_LIMIT_DURATION = 60000; // 1 minute
            //     if (user.lastVerificationAttempt) {
            //         console.log("lastVerificationAttempt" , user.lastVerificationAttempt)
            //         const timeSinceLastAttempt = Date.now() - new Date(user.lastVerificationAttempt).getTime();
            //         console.log("timeSinceLastAttempt" , timeSinceLastAttempt , RATE_LIMIT_DURATION)
            //         if (timeSinceLastAttempt < RATE_LIMIT_DURATION) {
            //             const remainingTime = Math.ceil((RATE_LIMIT_DURATION - timeSinceLastAttempt) / 1000);
            //             throw new BadRequestParameterError(
            //                 `Please wait ${remainingTime} seconds before requesting another verification email`
            //             );
            //         }
            //     }
            // }

            // Generate a verification ID using Kaleyra
            const response = await axios.post(
                `${this.KALEYRA_URL}/${this.KALEYRA_SID}/verify`,
                {
                    flow_id: this.KALEYRA_FLOW_ID,
                    to: {
                        mobile: `+91${phone}`
                    }

                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': this.KALEYRA_API_KEY
                    }
                }
            );

            console.log("Reseponse", response)

            // Handle successful response
            if (response && response.data?.data?.verify_id) {
                // user.verifyId = response.data.data.verify_id;
                // user.lastVerificationAttempt = new Date();
                // await user.save();

                return {
                    success: true,
                    verifyId: response.data.data.verify_id,
                    message: 'Verification OTP sent successfully'
                };
            }

            // Handle unexpected response format
            return {
                success: false,
                error: response?.error?.message || 'Failed to send verification email'
            }

        } catch (error) {

            // Axios error with response
            if (error.response) {
                console.error('Verification API Error:', {
                    status: error?.response?.status,
                    data: error?.response?.data
                });

                // Extract specific error message from API response
                const apiErrorMessage = error?.response?.data?.error?.message
                    || error?.response?.data?.message
                    || 'Failed to send verification email';

                return {
                    success: false,
                    status: error?.response?.status,
                    message: apiErrorMessage
                };
            }

            // Network or request setup errors
            if (error.request) {
                console.error('No response received:', error.request);
                return {
                    success: false,
                    message: 'No response from verification service'
                };
            }

            // Other unexpected errors
            console.error('Unexpected error in sendEmail:', error);
            return {
                success: false,
                message: error.message || 'Unexpected error sending verification email'
            };
        }
    }

    // Add this helper method to verify email otp with kaleyra api
    async verifyOtp(verifyId, otp) {
        try {

            const response = await axios.post(
                `${this.KALEYRA_URL}/${this.KALEYRA_SID}/verify/validate`,
                {
                    verify_id: verifyId,
                    otp: otp
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': this.KALEYRA_API_KEY
                    }
                }
            );

            if (response && response?.data?.data?.verify_id) {
                return {
                    success: true,
                    data: response?.data?.data
                }
            }

            return {
                success: false,
                message: "Verify OTP Failed"
            }

        } catch (error) {
            // Check if it's an Axios error with a response
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error("API Error Response:", error.response.data);
                console.error("Status Code:", error.response.status);

                if (error?.response?.data?.error?.code === 'E912') {
                    throw new BadRequestParameterError("Invalid OTP")
                }
                else if (error?.response?.data?.error?.code === 'E913') {
                    throw new BadRequestParameterError("The OTP has already expired")
                }
                else {
                    throw new Error('Verify OTP Failed');
                }

            } else if (error.request) {
                // The request was made but no response was received
                console.error("No response received:", error.request);
                throw new Error('No response received from the verification service');
            } else {

                // Something happened in setting up the request that triggered an Error
                if(error instanceof NoRecordFoundError) throw error
                else if(error instanceof BadRequestParameterError) throw error

                console.error("Error setting up request:", error.message);
                throw new Error(`Request setup error: ${error.message}`);
            }
        }
    }

    // Add this helper method to get apple public keys
    async getApplePublicKeys() {
        try {
            const response = await axios.get('https://appleid.apple.com/auth/keys');
            return response.data.keys;
        } catch (error) {
            throw new Error('Failed to fetch Apple public keys');
        }
    }

    // Add this helper method for token verification
    async verifyAppleToken(token) {
        try {
            // Get the Apple public keys
            const appleKeys = await this.getApplePublicKeys();

            // Decode the token header without verification
            const decodedHeader = jwt.decode(token, { complete: true }).header;

            // Find the matching key
            const matchingKey = appleKeys.find(key => key.kid === decodedHeader.kid);
            if (!matchingKey) {
                throw new Error('No matching Apple public key found');
            }

            // Convert the public key to PEM format
            const publicKey = createPublicKey({
                key: matchingKey,
                format: 'jwk'
            });

            // Verify the token
            const verified = jwt.verify(token, publicKey, {
                algorithms: ['RS256'],
                audience: this.APPLE_CLIENT_ID, // Your Apple Client ID
                issuer: 'https://appleid.apple.com'
            });

            return verified;
        } catch (error) {
            throw new Error(`Apple token verification failed: ${error.message}`);
        }
    }

    // Cleanup invalid tokens
    async cleanupInvalidTokens(failedTokens) {
        try {
            const invalidTokens = failedTokens.filter(ft =>
                [
                    'messaging/invalid-registration-token',
                    'messaging/registration-token-not-registered'
                ].includes(ft.error)
            ).map(ft => ft.token);

            if (invalidTokens.length > 0) {
                // Remove invalid tokens from all users
                await UserMongooseModel.updateMany(
                    { 'fcmTokens.token': { $in: invalidTokens } },
                    { $pull: { fcmTokens: { token: { $in: invalidTokens } } } }
                );
                // Log cleanup for monitoring
                console.log(`Cleaned up ${invalidTokens.length} invalid FCM tokens`);
            }
        } catch (error) {
            console.error('Failed to cleanup invalid tokens:', error);
            // Don't throw error as this is a cleanup operation
        }
    }

    // Periodic cleanup function (can be called via cron job)
    async periodicCleanup() {
        try {
            const users = await UserMongooseModel.find({
                'fcmTokens.0': { $exists: true } // Only users with FCM tokens
            });

            for (const user of users) {
                const tokens = user.fcmTokens.map(t => t.token);

                // Test each token
                const testMessages = tokens.map(token => ({
                    token,
                    data: { test: 'true' }
                }));

                const responses = await Promise.all(
                    testMessages.map(msg =>
                        admin.messaging()
                            .send(msg, true) // dry run
                            .catch(error => ({ error }))
                    )
                );

                const invalidTokens = tokens.filter((token, index) =>
                    responses[index].error
                );

                if (invalidTokens.length > 0) {
                    await this.cleanupInvalidTokens(
                        invalidTokens.map(token => ({
                            token,
                            error: 'messaging/invalid-registration-token'
                        }))
                    );
                }
            }

            return {
                success: true,
                message: 'Periodic cleanup completed'
            };
        } catch (error) {
            console.error('Failed to perform periodic cleanup:', error);
            throw new Error('Failed to perform periodic cleanup');
        }
    }

    async authWithGoogle(request, token) {
        let session = null
        try {

            // Start a transaction since we're doing user lookup and potential creation
            session = await mongoose.startSession();
            session.startTransaction();

            const { fcmToken } = request;

            // Step 1: Verify the Google ID token
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(token);
            }
            catch (error) {
                console.log("error", error)
                if (error.code === 'auth/id-token-expired') {
                    throw new UnauthenticatedError('Google token has expired')
                } else if (error.code === 'auth/argument-error') {
                    throw new UnauthenticatedError('Invalid Google token');
                } else {
                    console.error('Unexpected error during token verification:', error);
                    throw new UnauthenticatedError('Unexpected error during token verification:', error)
                }
            }

            const { uid, email, name, email_verified } = decodedToken;

            if (!email_verified) {
                throw new BadRequestParameterError('Google account email is not verified');
            }

            // Step 2: Check if user exists in the database
            let user = await UserMongooseModel.findOne({ email: email?.trim()?.toLowerCase() }, null, { session });

            if (user && user.status === "deleted") {
                throw new UnauthorisedError('Your account has been Deleted. Please contact support.');
            }

           // Strict separation - Don't allow cross-provider login
            if (user && user.authProvider !== 'google') {
                throw new ConflictError(`This email is already registered with ${user.authProvider} authProvider. Please use ${user.authProvider} to sign in.`);
            }

            if (!user) {
                // Step 3: If user doesn't exist, create a new one
                user = await UserMongooseModel.create([
                    {
                        name: name.trim().replace(/\s+/g, ' '), // Sanitize name, 
                        email: email.trim().toLocaleLowerCase(),
                        authProvider: 'google',
                        providerId: uid,
                        status: 'active',
                        isEmailVerified: true,
                        isFirstLogin: true,
                        registeredAt: new Date(),
                        lastLogin: new Date(),
                        fcmTokens: fcmToken ? [{ token: fcmToken, device: deviceInfo, lastUsed: new Date() }] : []
                    }
                ],{session});

                user = user[0]; // Create returns an array when used with session

            } else {
                // Step 4: If user exists, update the provider ID and last login time , check there status
                user.providerId = uid;
                user.lastLogin = new Date();
                user.authProvider = 'google'
                user.name = name ? name.trim().replace(/\s+/g, ' ') : user.name
                // Save user changes
                await user.save({ session });
            }

            // Commit transaction
            await session.commitTransaction();
            session.endSession();

            // Step 6: Generate access and refresh tokens for the user
            const accessToken = user.generateAccessToken();
            return { success: true, message: 'Auth successfull', user: this.sanitizeUser(user) , accessToken  };

        } catch (error) {

            if(session){
                // Rollback transaction on error
                await session.abortTransaction();
                session.endSession();
            }

            // Log the error with context
            console.error('Google sign-in error:', {
                error: error.message,
                stack: error.stack,
            });    

            if(error instanceof UnauthenticatedError) throw error
            else if(error instanceof BadRequestParameterError) throw error
            else if(error instanceof UnauthorisedError) throw error
            else if(error instanceof ConflictError) throw error

            throw error instanceof Error ? error : new Error('Google sign-in failed');
        }
    }

    async authWithApple(request, identityToken) {
        try {
            const { name, appleId, email: userEmail } = request;

            // Verify Apple token
            let decodedToken;
            try {
                // decodedToken = await this.verifyAppleToken(identityToken);
                decodedToken = jwt.decode(identityToken);
                console.log("decodedToken", decodedToken)
                if (!decodedToken || !decodedToken.sub) {
                    throw new BadRequestParameterError('Invalid Token Paylod');
                }
            } catch (error) {
                console.log("Apple error is ", error)
                switch (error.code) {
                    case 'TOKEN_EXPIRED':
                        throw new UnauthenticatedError('Apple token has expired.');
                    case 'INVALID_TOKEN':
                        throw new BadRequestParameterError('Invalid Apple authentication token');
                    case 'VERIFICATION_FAILED':
                        throw new UnauthenticatedError('Apple token verification failed');
                    default:
                        throw new UnauthenticatedError('Invalid or expired Apple token');
                }
            }

            const { sub: appleUserId, email, name: appleName } = decodedToken;

            if (!email && !userEmail) {
                throw new BadRequestParameterError('Email is required for Apple sign-in');
            }

            // Step 2: Check if user exists in the database
            let user = await UserMongooseModel.findOne({ email: (userEmail && userEmail?.trim?.toLocaleLowerCase()) || email?.trim().toLowerCase() });

            if (user && user.status === "deleted") {
                throw new UnauthorisedError('Your account has been Deleted. Please contact support.');
            }

            // Strict separation - Don't allow cross-provider login
            if (user && user.authProvider !== 'apple') {
                throw new ConflictError(`This email is already registered with ${user.authProvider} authProvider. Please use ${user.authProvider} to sign in.`);
            }

            // Step 3: If user doesn't exist, create a new one
            if (!user) {
                // Note: appleUser might contain firstName and lastName on first sign-in
                if (!appleName && (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50)) {
                    throw new BadRequestParameterError('Name is required and must be between 2 and 50 characters');
                }

                if (!appleId && !appleUserId) {
                    throw new BadRequestParameterError("Apple UserId is required")
                }

                const userName = appleName?.name ?
                    `${appleName.name.firstName || ''} ${appleName.name.lastName || ''}`.trim() :
                    name?.trim()?.replace(/\s+/g, ' '); // Sanitize name;

                user = await UserMongooseModel.create({
                    name: userName,
                    email: (userEmail && userEmail?.trim().toLocaleLowerCase()) || email?.trim()?.toLowerCase(),
                    authProvider: 'apple',
                    providerId: appleUserId || appleId,
                    status: 'active',
                    isEmailVerified: true,
                    isFirstLogin: false,
                    registeredAt: new Date(),
                    lastLogin: new Date(),
                    fcmTokens: []
                });
            } else {

                // Validate name if provided
                if (name && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50)) {
                    throw new BadRequestParameterError('Name must be between 2 and 50 characters');
                }

                if (!appleId && !appleUserId) {
                    throw new BadRequestParameterError("Apple UserId is required")
                }

                user.providerId = appleUserId || appleId;
                user.lastLogin = new Date();
                user.authProvider = 'apple'
                user.name = (name && name?.trim()?.replace(/\s+/g, ' ')) || user.name;
                await user.save();
            }

            // Step 6: Generate access token for the user
            const accessToken = user.generateAccessToken();
            return { success: true , message: 'Auth successfull', user: this.sanitizeUser(user), accessToken };

        } catch (error) {
            console.error('Apple sign-in error:', error);
            if(error instanceof UnauthenticatedError) throw error
            else if(error instanceof BadRequestParameterError) throw error
            else if(error instanceof UnauthorisedError) throw error
            else if(error instanceof ConflictError) throw error


            throw new Error(error.message || 'Apple sign-in failed');
        }
    }

    async authWithPhone(request) {
        let session = null
        try {

            // Start a transaction since we're doing user lookup and potential creation
            session = await mongoose.startSession();
            session.startTransaction();

            const { phone  } = request;
            const trimmedPhone = phone.trim()

            let otp = await OTP.findOne({ phone: trimmedPhone }).session(session);

            if (otp && otp.verifyId) {
                const RATE_LIMIT_DURATION = 60000; // 1 minute
                if (otp.lastVerificationAttempt) {
                    console.log("lastVerificationAttempt", otp.lastVerificationAttempt)
                    const timeSinceLastAttempt = Date.now() - new Date(otp.lastVerificationAttempt).getTime();
                    console.log("timeSinceLastAttempt", timeSinceLastAttempt, RATE_LIMIT_DURATION)
                    if (timeSinceLastAttempt < RATE_LIMIT_DURATION) {
                        const remainingTime = Math.ceil((RATE_LIMIT_DURATION - timeSinceLastAttempt) / 1000);
                        throw new BadRequestParameterError(
                            `Please wait ${remainingTime} seconds before requesting another verification otp`
                        );
                    }
                }
            }
            else{
                otp = new OTP()
            }

            const sendOtp = await this.sendOtp(trimmedPhone);

            if (!sendOtp.success) {
                throw new Error(sendOtp?.message || 'Failed to send verification OTP');
            }

            otp.phone = trimmedPhone
            otp.verifyId = sendOtp.verifyId
            otp.lastVerificationAttempt = new Date();
            await otp.save({ session });

            await session.commitTransaction();
            session.endSession();


            return {
                success: true,
                message: `Verification OTP sent successfully to ${trimmedPhone}`,
            };

        } catch (error) {
            console.error('Error in authWithPhone:', {
                error: error.message,
                stack: error.stack,
            });
            if(session){
                await session.abortTransaction();
                session.endSession();
            }
            if(error instanceof BadRequestParameterError) throw error
            throw new Error(error.message || "Verification otp send failed")
        }
    }

    async authWithPhoneVerify(request) {
        let session = null
        try {

            // Start a transaction since we're doing user lookup and potential creation
            session = await mongoose.startSession();
            session.startTransaction();

            const { phone, otp , fcmToken } = request;
            const trimmedPhone = phone.trim();

            // Verify OTP
            const otpRecord = await OTP.findOne({ phone: trimmedPhone }).session(session);

            // Verify ID check
            if (!otpRecord || !otpRecord.verifyId) {
                throw new BadRequestParameterError(
                    `No verification in progress with phone: ${trimmedPhone}`
                );
            }

            // Check OTP expiration
            const VERIFICATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
            if (otp.lastVerificationAttempt) {
                const timeSinceRequest = Date.now() - new Date(otp.lastVerificationAttempt).getTime();
                if (timeSinceRequest > VERIFICATION_TIMEOUT) {
                    // await OTP.deleteOne({ _id: otpRecord._id });
                    throw new BadRequestParameterError(
                        'Verification code has expired'
                    );
                }
            }

            const response = await this.verifyOtp(otpRecord.verifyId, otp);

            if (!response.success) {
                throw new BadRequestParameterError(response.message || "Invalid or expired OTP")
            }

            await OTP.deleteOne({ _id: otpRecord._id }).session(session);

            let user = await UserMongooseModel.findOne({phone: trimmedPhone})

            if(!user){
                user = new UserMongooseModel({
                    phone: trimmedPhone,
                    status: 'active',
                    isPhoneVerified: true,
                    authProvider: "mobile",
                    isFirstLogin: true,
                    fcmTokens: fcmToken ? [{
                        token: fcmToken,
                        device: deviceInfo,
                        lastUsed: new Date()
                    }] : [],
                    registeredAt: new Date(),
                    lastLogin: new Date(),
                });
                await user.save({ session });
            }
            else{
                user.lastLogin = new Date();
                await user.save({ session });
            }

            await session.commitTransaction();
            session.endSession();


            const accessToken = await user.generateAccessToken();

            return {
                success: true,
                message: 'Auth successfull',
                data: this.sanitizeUser(user),
                accessToken
            };
        } catch (error) {
            console.error('Error in authWithPhoneVerify:', {
                error: error.message,
                stack: error.stack
            });
            if(session){
                await session.abortTransaction();
                session.endSession();
            }
            if(error instanceof NoRecordFoundError || error instanceof BadRequestParameterError) throw error
            throw new Error(error.message || 'Phone Auth failed');
        }
    }

    async initiatePhoneUpdate(request, user) {
        let session = null
        try {

            // Start a transaction since we're doing user lookup and potential creation
            session = await mongoose.startSession();
            session.startTransaction();

            const { uid } = user.decodedToken;
            const { phone } = request;
    
            if (!phone) {
                throw new BadRequestParameterError('Please provide a phone number.');
            }
    
            const trimmedPhone = phone.trim();
            const existingUser = await UserMongooseModel.findById(uid).session(session);
    
            if (!existingUser) {
                throw new NoRecordFoundError('User not found. Please try again.');
            }
    
            // Check if the provided phone number is already verified
            if (existingUser.isPhoneVerified && trimmedPhone === existingUser.phone) {
                return {
                    success: true,
                    message: 'This phone number is already verified for your account.',
                    requiresPhoneVerification: false
                };
            }
    
            // Ensure the provided phone matches the user's current phone
            if (trimmedPhone !== existingUser.phone) {
                throw new BadRequestParameterError('The provided phone number does not match your current account phone number.');
            }
    
            // Check for rate limiting
            let otp = await OTP.findOne({ phone: trimmedPhone }).session(session);
            if (otp && otp.verifyId) {
                const RATE_LIMIT_DURATION = 60000; // 1 minute
                const timeSinceLastAttempt = Date.now() - new Date(otp.lastVerificationAttempt).getTime();
                if (timeSinceLastAttempt < RATE_LIMIT_DURATION) {
                    const remainingTime = Math.ceil((RATE_LIMIT_DURATION - timeSinceLastAttempt) / 1000);
                    throw new BadRequestParameterError(`Please wait ${remainingTime} seconds before requesting another verification code.`);
                }
            } else {
                otp = new OTP();
            }
    
            // Send the OTP
            const sendOtp = await this.sendOtp(trimmedPhone);
            if (!sendOtp.success) {
                throw new Error(sendOtp.message || 'Failed to send the verification code. Please try again.');
            }
    
            // Update OTP and user details
            otp.phone = trimmedPhone;
            otp.verifyId = sendOtp.verifyId;
            otp.lastVerificationAttempt = new Date();
            existingUser.pendingPhone = trimmedPhone;
    
            await existingUser.save({ session });
            await otp.save({ session });

            await session.commitTransaction();
            session.endSession();
    
            return {
                success: true,
                message: `A verification code has been sent to ${trimmedPhone}`,
                requiresPhoneVerification: true
            };
        } catch (error) {
            console.error('Error initiating phone update:', {
                error: error.message,
                stack: error.stack
            });
            if(session){
                await session.abortTransaction();
                session.endSession();
            }
            if (error instanceof NoRecordFoundError || error instanceof BadRequestParameterError) {
                throw error;
            }
    
            throw new Error('An error occurred while sending otp.');
        }
    }

    async verifyPhoneVerification(request, user) {
        let session = null
        try {

            // Start a transaction since we're doing user lookup and potential creation
            session = await mongoose.startSession();
            session.startTransaction();

            const { otp, phone } = request;
            const { uid } = user.decodedToken;
            const trimmedPhone = phone.trim();
    
            // Fetch the existing user from the database
            const existingUser = await UserMongooseModel.findById(uid).session(session);
            if (!existingUser) {
                throw new NoRecordFoundError('User not found');
            }

            if(existingUser.pendingPhone !== trimmedPhone){
                throw new BadRequestParameterError("The provided phone number does not match your current account phone number.")
            }
    
            // Fetch the OTP record associated with the phone number
            const otpRecord = await OTP.findOne({ phone: trimmedPhone }).session(session);
            if (!existingUser.pendingPhone || !otpRecord || !otpRecord.verifyId || existingUser.pendingPhone !== trimmedPhone) {
                throw new BadRequestParameterError(`No pending phone verification found with phone ${trimmedPhone}`);
            }
    
            // Check if the OTP has expired
            const VERIFICATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
            if (existingUser.lastVerificationAttempt) {
                const timeSinceRequest = Date.now() - new Date(existingUser.lastVerificationAttempt).getTime();
                if (timeSinceRequest > VERIFICATION_TIMEOUT) {
                    // await OTP.deleteOne({ _id: otpRecord._id });
                    throw new BadRequestParameterError('The verification code has expired');
                }
            }
    
            // Verify the OTP
            const response = await this.verifyOtp(otpRecord.verifyId, otp);
            if (!response.success) {
                throw new BadRequestParameterError( response.message || 'Verification failed.');
            }
    
            // Clean up OTP record after successful verification
            await OTP.deleteOne({ _id: otpRecord._id }).session(session);
    
            // Update user's phone number and verification status
            existingUser.phone = existingUser.pendingPhone;
            existingUser.pendingPhone = undefined;
            existingUser.isPhoneVerified = true;
            existingUser.status = "active";
            await existingUser.save({ session });

            await session.commitTransaction();
            session.endSession();

            return {
                success: true,
                message: 'Your phone number has been successfully updated and verified.',
                user: this.sanitizeUser(existingUser)
            };
        } catch (error) {
            console.error('Error verifying phone verification:', {
                error: error.message,
                stack: error.stack
            });
            if(session){
                await session.abortTransaction
                session.endSession
            }
            if (error instanceof BadRequestParameterError || error instanceof NoRecordFoundError) {
                throw error;
            }
            throw new Error('An unexpected error occurred. Please try again later.');
        }
    }

    async currentUser(request, user) {
        try {
            // Extract `uid` from the decoded token
            const { uid } = user.decodedToken;

            // Find the user by their unique ID
            const foundUser = await UserMongooseModel.findById(uid);
            if (!foundUser) {
                throw new NoRecordFoundError('User not found');
            }
            // Return sanitized user details
            return {
                success: true,
                message: "User data send successfully",
                data: this.sanitizeUser(foundUser)
            };
        } catch (error) {
            console.error('Current user retrieval error:', {
                error: error.message,
                stack: error.stack
            });
            if(error instanceof NoRecordFoundError) throw error
            throw new Error(error.message || 'Failed to get user details');
        }
    }

    async updateDetails(request, user) {
        try {
            const { uid } = user.decodedToken;
            const { name, email, phone, gender } = request;
    
            const existingUser = await UserMongooseModel.findById(uid);
            if (!existingUser) {
                throw new NoRecordFoundError('User not found');
            }
    
            // First-time profile update checks
            if (existingUser.isFirstLogin && existingUser.authProvider === "mobile") {
                if (!name || !email || !gender) {
                    throw new BadRequestParameterError('Please provide all required fields: name, email, and gender.');
                }

                if (phone) {
                    throw new BadRequestParameterError("Unable to update the phone number: It is already verified.");
                }
            }

            if(existingUser.isFirstLogin && existingUser.authProvider !== "mobile") {
                // if (!name || !phone || !gender) {
                //     throw new BadRequestParameterError('Please provide all required fields: name, phone, and gender.');
                // }

                if (!phone) {
                    throw new BadRequestParameterError('Please provide all required field:phone');
                }
    
                if (email && email !== existingUser.email) {
                    throw new BadRequestParameterError("Unable to update the email: It is already verified.");
                }
            }

            // Email update check for non-first-time users
            if (!existingUser.isFirstLogin && email && existingUser.authProvider !== 'mobile') {
                throw new BadRequestParameterError(`Your email is linked to your ${existingUser.authProvider} account and cannot be changed here.`);
            }

            // Phone update check for non-first-time users
            // if(!existingUser.isFirstLogin && phone && existingUser.isPhoneVerified){
            //     throw new BadRequestParameterError("Unable to update the phone number: It is already verified.")
            // }

            // Consolidate email and phone uniqueness checks
            const queryConditions = [];
            if (email && email.trim().toLowerCase() !== existingUser.email) {
                queryConditions.push({ email: email.trim().toLowerCase(), _id: { $ne: uid } });
            }
            if (phone && phone.trim() !== existingUser.phone) {
                queryConditions.push({ phone: phone.trim(), _id: { $ne: uid } });
            }

            if (queryConditions.length > 0) {
                const conflictingUser = await UserMongooseModel.findOne({ $or: queryConditions });
                if (conflictingUser) {
                    if (email && conflictingUser.email === email.trim().toLowerCase()) {
                        throw new ConflictError('The provided email is already associated with another account.');
                    }
                    if (phone && conflictingUser.phone === phone.trim()) {
                        throw new ConflictError('This phone number is already registered');
                    }
                }
            }
    
            // Update user details if changes are detected
            let hasChanges = false;
    
            if (name && name.trim().replace(/\s+/g, ' ') !== existingUser.name) {
                existingUser.name = name.trim().replace(/\s+/g, ' ');
                hasChanges = true;
            }
    
            if (email && email.trim().toLowerCase() !== existingUser.email) {
                existingUser.email = email.trim().toLowerCase();
                hasChanges = true;
            }
    
            if (gender && gender !== existingUser.gender) {
                existingUser.gender = gender;
                hasChanges = true;
            }
    
            if (phone && phone.trim() !== existingUser.phone) {
                existingUser.isPhoneVerified = false;
                existingUser.phone = phone.trim();
                existingUser.pendingPhone = phone.trim();
                hasChanges = true;
            }
    
            if (!hasChanges) {
                return {
                    success: true,
                    message: 'No updates were made as the provided details are unchanged.',
                    data: this.sanitizeUser(existingUser)
                };
            }
    
            existingUser.updatedAt = new Date();
            existingUser.isFirstLogin = false
            await existingUser.save();
    
            return {
                success: true,
                message: 'User details updated successfully.',
                data: this.sanitizeUser(existingUser),
            };
        } catch (error) {
            console.error('Error updating user details:', {
                error: error.message,
                stack: error.stack
            });
            if (error instanceof ConflictError || error instanceof UnauthenticatedError || error instanceof NoRecordFoundError || error instanceof BadRequestParameterError) {
                throw error;
            }
            throw new Error('An error occurred while updating user details. Please try again.');
        }
    }

    async removeAccount(request, user) {
        let session = null;
        try {
            // Start transaction
            session = await mongoose.startSession();
            session.startTransaction();
    
            const userId = user.decodedToken.uid;
            const existUser = await UserMongooseModel.findById(userId).session(session);
    
            if (!existUser) {
                throw new NoRecordFoundError("User not found");
            }
    
            // Find cart with session
            const cartId = await Cart.findOne({ userId }).session(session);
    
            // Remove sensitive data with consistent session syntax
            await Promise.all([
                DeliveryAddressMongooseModel.deleteMany({ userId }).session(session),
                Cart.deleteMany({ userId }).session(session),
                CartItem.deleteMany({ cart: cartId?._id }).session(session),
                Interest.deleteMany({ 
                    $or: [
                        { email: existUser.email }, 
                        { phone: existUser.phone }
                    ] 
                }).session(session)
            ]);
    
            // Delete user account with session
            await UserMongooseModel.findByIdAndDelete(userId).session(session);
    
            // Commit the transaction
            await session.commitTransaction();
            session.endSession();
    
            return {
                success: true,
                message: 'Account successfully deleted',
                deletionDate: new Date()
            };
    
        } catch (error) {
            // Abort transaction on error
            console.error("Failed to remove user Account", {
                error: error.message,
                stack: error.stack
            });
            if (session) {
                await session.abortTransaction();
                session.endSession();
            }
    
            if (error instanceof NoRecordFoundError) throw error;
            throw new Error("Error deleting account. Please try again later");
        }
    }

    async updateFcmToken(request, deviceInfo, user) {
        try {
            const { fcmToken } = request;
            const { uid } = user.decodedToken;

            const currentUser = await UserMongooseModel.findById(uid);
            if (!currentUser) {
                throw new NoRecordFoundError('User not found');
            }

            // Limit the number of tokens per user (optional)
            if (currentUser.fcmTokens.length >= this.MAX_TOKENS_PER_USER) {
                // Remove oldest token
                currentUser.fcmTokens.sort((a, b) => b.lastUsed - a.lastUsed);
                currentUser.fcmTokens.pop();
            }

            const existingToken = currentUser.fcmTokens.find(t => t.token === fcmToken);
            if (!existingToken) {
                currentUser.fcmTokens.push({ token: fcmToken, device: deviceInfo, lastUsed: new Date() });
            } else {
                existingToken.device = deviceInfo;
                existingToken.lastUsed = new Date();
            }

            await currentUser.save();

            return {
                success: true,
                message: 'FCM token updated successfully'
            };
        } catch (error) {
            console.error('Update FCM token error:', {
                error: error.message,
                stack: error.stack
            });
            if(error instanceof NoRecordFoundError) throw error
            throw new Error(error.message || 'Failed to update FCM token');
        }
    }

    async sendPushNotification(request) {
        try {

            const { title, body, data, tokens } = request;

            // Validate input parameters
            if (!title || !body) return;

            if (!tokens || !Array.isArray(tokens) || tokens.length === 0) return;

            // Ensure data is an object
            const sanitizedData = data && typeof data === 'object' ? data : {};

            // Message payload for FCM
            const message = {
                notification: {
                    title,
                    body,
                },
                data: {
                    ...sanitizedData,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK', // For Flutter apps
                },
                tokens: tokens, // Multiple tokens for multicast messaging
                apns: {  // iOS specific configuration
                    payload: {
                        aps: {
                            sound: 'default', // Dynamic: Can be custom sound file name custom_sound.wav
                            badge: 1,
                            'content-available': 1
                        }
                    }
                },
                android: { // Android specific configuration
                    priority: 'high',
                    notification: {
                        sound: 'default', // Dynamic: Can be custom sound file name custom_sound.wav
                        priority: 'high',
                        channelId: NOTIFICATION_CHANNELS.DEFAULT
                    }
                }
            };

            // Send message using Firebase Admin SDK
            const response = await admin.messaging().sendMulticast(message);

            // Handle failed tokens
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push({
                        token: tokens[idx],
                        error: resp.error.code
                    });
                }
            });

            // Clean up failed tokens
            if (failedTokens.length > 0) {
                await this.cleanupInvalidTokens(failedTokens);
            }

            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount,
                failedTokens
            };
        } catch (error) {
            console.error('Failed to send push notification:', error);
        }
    }

    async inviteForm(request, user) {
        try {
            const { name, email  } = request
            const sanitizedName = name.trim().replace(/\s+/g, ' ')
            const sanitizedEmail = email.trim().toLowerCase()

            const existingInterestForm = await Interest.findOne({email: sanitizedEmail})

            if (existingInterestForm) {
                throw new ConflictError(`Invite request already exist with email:${sanitizedEmail}`)
            }

            const interest = await Interest.create({
                name: sanitizedName,
                email: sanitizedEmail,
            })

            return {
                success: true,
                message: "Interest form submitted successfully",
                interest: interest
            }
        } catch (error) {
            // Log the error with context
            console.error('Error in submitting InviteForm:', {
                error: error.message,
                stack: error.stack,
            });

            if (error instanceof ConflictError) {
                // Re-throw the ConflictError to be handled by the middleware or controller
                throw error;
            }
            throw new Error(error.message || "Error Processing interest form")
        }
    }

    async checkInvitedUser(request) {
        try {
            const { email } = request;
            const sanitizedEmail = email.trim().toLowerCase()
    
            const invite = await Interest.findOne({ email: sanitizedEmail });
    
            if (!invite) {
                throw new NoRecordFoundError(`No invitation found for the provided email: ${sanitizedEmail}`);
            }
    
            return {
                success: true,
                message: `An invitation exists for the email: ${sanitizedEmail}`,
                data: {
                    _id: invite._id,
                    name: invite.name,
                    email: invite.email,
                    status: invite.status,
                    createdAt: invite.createdAt,
                    "__v": invite["__v"]
                }
            };
    
        } catch (error) {
            // Log the error with context
            console.error('Error in checking invitation status:', {
                error: error.message,
                stack: error.stack,
            });
            if (error instanceof NoRecordFoundError) throw error;
    
            throw new Error(error.message || 'An unexpected error occurred.');
        }
    }
    
    async validateCode(request) {
        try {
            const { email, inviteCode } = request;
            const sanitizedEmail = email.trim().toLowerCase()
    
            const invite = await Interest.findOne({ email: sanitizedEmail });
    
            if (!invite) {
                throw new NoRecordFoundError(`No valid invitation found for the email: ${sanitizedEmail}.`);
            }

            if(invite.status === "pending"){
                throw new BadRequestParameterError("The invitation is still pending. Please wait for approval.")
            }

            if(invite.status === "registered"){
                throw new BadRequestParameterError("The invite email already complete registration")
            }

            if (invite.inviteCode !== inviteCode) {
                throw new BadRequestParameterError("The invitation code provided is incorrect");
            }
    
            // Check if the invite code has expired
            if (invite.inviteExpiry && new Date() > invite.inviteExpiry) {
                throw new BadRequestParameterError('The invitation code has expired');
            }
    
            invite.status = 'registered';
            await invite.save();
    
            return {
                success: true,
                message: "The invitation code has been successfully validated."
            };
    
        } catch (error) {
            console.error('Error in validating invitation code', {
                error: error.message,
                stack: error.stack,
            });
            if (error instanceof NoRecordFoundError || error instanceof BadRequestParameterError) throw error;    
            throw new Error( error.message || 'An unexpected error occurred.');
        }
    }

    async resendCode(request) {
        let session = null
        try {

            // Start Transaction
            session = await mongoose.startSession();
            session.startTransaction()

            const { email } = request;
            const sanitizedEmail = email.trim().toLowerCase()
    
            let invite = await Interest.findOne({ email: sanitizedEmail });
    
            if (!invite) {
                throw new NoRecordFoundError(`No valid invitation found for the email: ${sanitizedEmail}`);
            }

            if(invite.status === "pending"){
                throw new BadRequestParameterError("The invitation is still pending. Please wait for approval.")
            }

            if(invite.status === "registered"){
                throw new BadRequestParameterError("The invite email already complete registration")
            }
    
            // Generate Invite Code
            const inviteCode = this.generateInviteCode();

            // Update interest with invite details
            invite.inviteCode = inviteCode;
            invite.status = "invited";
            invite.invitedAt = new Date();
            invite.inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry
            await invite.save();

            // Send invite email
            await emailService.sendInviteEmail(invite.email, invite.name, inviteCode , invite.inviteExpiry );

             return {
                success: true,
                message: `Invite sent successfully to ${invite.email}`,
            };
    
        } catch (error) {
            if(session){
                await session.abortTransaction
                session.endSession()
            }

            // Log the error with context
            console.error('Error in resendCode:', {
                error: error.message,
                stack: error.stack,
            });

            if (error instanceof NoRecordFoundError || error instanceof BadRequestParameterError) throw error;    
            throw new Error(error.message || "Error while sending invite link");
        }
    }

}

export default UserService;