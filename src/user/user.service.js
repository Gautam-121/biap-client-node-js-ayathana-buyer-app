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

const emailService = new EmailService();

class UserService {
    constructor() {
        this.KALEYRA_SID = process.env.KALEYRA_SID || 'HXAP1693668585IN';
        this.KALEYRA_API_KEY = process.env.KALEYRA_API_KEY || 'A9519e83851564e6223ed07308f90c7a3';
        this.KALEYRA_URL = process.env.KALEYRA_URL || 'https://api.kaleyra.io/v1';
        this.KALEYRA_FLOW_ID = process.env.KALEYRA_FLOW_ID || '43d2cba7-106e-426b-a1a3-a883153f6842';
        this.JWT_SECRET = process.env.JWT_SECRET || 'your_access_token_secret';
        this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
        this.APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || 'your_apple_client_id';
        this.APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || 'your_apple_team_id';
        this.APPLE_KEY_ID = process.env.APPLE_KEY_ID || 'your_apple_key_id';
        this.APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY || 'your_apple_private_key'; // Your private key from Apple
    }

    // Helper Methods
    sanitizeUser(user) {
        const userObject = user.toObject();
        delete userObject.password;
        delete userObject?.fcmTokens;
        delete userObject?.isEmailVerified
        delete userObject?.providerId
        delete userObject?.verifyId
        delete userObject?.resetPasswordId
        return userObject;
    }

    // Add this helper method for sending emails with kaleyra api
    async sendEmail(request) {
        try {
            // Generate a verification ID using Kaleyra
            const response = await axios.post(
                `${this.KALEYRA_URL}/${this.KALEYRA_SID}/verify`,
                {
                    flow_id: this.KALEYRA_FLOW_ID,
                    to: {
                        mobile: request.phone,
                        email: request.email
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': this.KALEYRA_API_KEY
                    }
                }
            );

            return response;
        } catch (error) {
            throw new Error(error.message || 'Failed to send email');
        }
    }

    // Add this helper method to verify email otp with kaleyra api
    async verifyEmailOtp(verifyId, otp) {
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

            return response;
        } catch (error) {
            throw new Error(error.message || 'Failed to verify email otp');
        }
    }

    async sendPhoneVerificationOtp(request) {
        try {
            // Generate a verification ID using Kaleyra
            const response = await axios.post(
                `${this.KALEYRA_URL}/${this.KALEYRA_SID}/verify`,
                {
                    flow_id: this.KALEYRA_FLOW_ID,
                    to: {
                        mobile: request.phone,
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': this.KALEYRA_API_KEY
                    }
                }
            );

            return response;
        } catch (error) {
            throw new Error(error.message || 'Failed to send email');
        }
    }

    // Add this helper method to verify email otp with kaleyra api
    async verifyPhoneVerificationOtp(verifyId, otp) {
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

            return response;
        } catch (error) {
            throw new Error(error.message || 'Failed to verify email otp');
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

    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async authenticateWithGoogle(request , deviceInfo) {
        try {

            const { token, fcmToken } = request;
            
            // Step 1: Verify the Google ID token
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(token);
            } catch (error) {
                throw new BadRequestParameterError('Invalid Google token');
            }

            const { uid, email, name, email_verified } = decodedToken;

            if (!email_verified) {
                throw new BadRequestParameterError('Google account email is not verified');
            }
    
            // Step 2: Check if user exists in the database
            let user = await UserMongooseModel.findOne({ email: email.trim().toLowerCase()});

            if (user && user.authProvider !== 'google') {
                throw new ConflictError('Email already registered with', user.authProvider);
            }

            if (!user) {   
                // Step 3: If user doesn't exist, create a new one
                user = await UserMongooseModel.create({
                    name, 
                    email, 
                    authProvider: 'google', 
                    providerId: uid, 
                    isEmailVerified: true, 
                    status: 'active',
                    lastLogin: new Date(),
                    fcmTokens: fcmToken ? [{ token: fcmToken, device: deviceInfo, lastUsed: new Date() }] : []
                });
            } else {
                // Step 4: If user exists, update the provider ID and last login time
                user.providerId = uid;
                user.lastLogin = new Date();
                user.name = name || user.name;
                user.status = 'active';
    
                // Step 5: Update the FCM token if provided
                if (fcmToken) {
                    const existingToken = user.fcmTokens.find(t => t.token === fcmToken);
                    if (!existingToken) {
                        user.fcmTokens.push({ token: fcmToken, device: deviceInfo, lastUsed: new Date() });
                    } else {
                        existingToken.device = deviceInfo;
                        existingToken.lastUsed = new Date();
                    }
                }
    
                await user.save();
            }
    
            // Step 6: Generate access and refresh tokens for the user
            const { accessToken } = user.generateAccessToken();
            return { message: 'Sign-in successful', user: this.sanitizeUser(user), accessToken };

        } catch (error) {
            throw error instanceof Error ? error : new Error('Google sign-in failed');
        }
    }

    async register(request, deviceInfo) {
        try {
            const { name, email, password, phone, fcmToken } = request;
    
            // Sanitize and trim the name
            const sanitizedName = name?.trim().replace(/\s+/g, ' ') || '';
    
            // Check if a user with the same email or phone already exists
            const existingUser = await UserMongooseModel.findOne({ 
                $or: [{ email: email.trim().toLowerCase() }, { phone: phone.trim() }] 
            });
            
            if (existingUser) {
                const message = existingUser.email === email.trim().toLowerCase() 
                    ? 'Email already registered' 
                    : 'Phone already registered';
                throw new ConflictError(message);
            }    
            // Create a new user with sanitized data
            const user = await UserMongooseModel.create({
                name: sanitizedName,
                email: email.trim().toLowerCase(),
                password,
                phone: phone.trim(),
                fcmTokens: fcmToken ? [{ token: fcmToken, device: deviceInfo }] : [],
                authProvider: 'email',
                status: "pending"
            });

            return {
                message: 'Registration successful',
                userId: this.sanitizeUser(user)
            };
        } catch (error) {
            throw new Error(error.message || 'Registration failed');
        }
    }

    async login(request, deviceInfo) { 
        try {

            const { email, password, fcmToken } = request;
    
            const user = await UserMongooseModel.findOne({ email: email.trim().toLowerCase() , authProvider: 'email'}).select('+password');
            if (!user) {
                throw new NoRecordFoundError('User not found');
            }

            const isPasswordMatched = await user.isPasswordCompare(password);
            if (!isPasswordMatched) {
                throw new BadRequestParameterError('Invalid Email and password');
            }

            if (!user.isEmailVerified) {
                throw new BadRequestParameterError('Please verify your Email before logging in');
            }

            // If FCM token is provided, update the user's device information
            if (fcmToken) {
                const existingToken = user.fcmTokens.find(tokenObj => tokenObj.token === fcmToken);
                if (!existingToken) {
                    user.fcmTokens.push({ token: fcmToken, device: deviceInfo, lastUsed: new Date() });
                } else {
                    existingToken.device = deviceInfo;
                    existingToken.lastUsed = new Date();
                }
                await user.save(); // Save the updated user with the new fcmToken
            }
    
            const { accessToken } = user.generateAccessToken();
    
            return { 
                message: 'Login successful', 
                user: this.sanitizeUser(user), 
                accessToken 
            };
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    }

    async sendVerificationEmail(request) {
        try {
            const { email } = request;

            const user = await UserMongooseModel.findOne({ email : email.trim().toLowerCase() , authProvider: 'email' });
            if (!user) {
                throw new NoRecordFoundError('User not found');
            }

            // Check if email is already verified
            if (user.isEmailVerified) {
                throw new BadRequestParameterError('Email is already verified');
            }

            if (!user.phone) {
                throw new BadRequestParameterError('No phone number found for this user');
            }

            const response = await this.sendEmail(user);

            if (response?.data?.verify_id) {
                user.verifyId = response.data.verify_id;
                await user.save();
    
                return {
                    success: true,
                    message: 'Verification email sent successfully',
                };
            }

            throw new Error(response?.error?.message || 'Invalid response from email service');
        } catch (error) {
            throw new Error(error.message || 'Failed to send verification email');
        }
    }
    
    async verifyEmail(request) {
        try {
            const { email , otp } = request
            
            const user = await UserMongooseModel.findOne({ email : email.trim().toLowerCase() , authProvider: 'email'});
            if (!user) {
                throw new NoRecordFoundError('User not found');
            }

            if (!user.verifyId) {
                throw new BadRequestParameterError('Please request a verification email first');
            }

            if (user.isEmailVerified) {
                throw new BadRequestParameterError('Email already verified', 400);
            }

            const response = await this.verifyEmailOtp(user.verifyId, otp);

            if (response?.error && Object.keys(response?.error).length > 0) {
                throw new BadRequestParameterError(response.error.message || 'Failed to verify email');
            }

            user.isEmailVerified = true;
            user.verifyId = null;
            user.status = 'active';
            await user.save();

            return {
                success: true,
                message: 'Email verified successfully',
            };
        } catch (error) {
            throw new Error(error.message || 'Email verification failed');
        }
    }

    async forgotPassword(request) {
        try {
            const { email } = request;

            // Find user and validate
            const user = await UserMongooseModel.findOne({ 
                email: email.trim().toLowerCase(),
                authProvider: 'email' // Only allow password reset for email-based accounts
            });
            
            if (!user) {
                throw new NoRecordFoundError('User not found');
            }

            // Generate OTP
            const otp = this.generateOTP();
            
            // Hash the OTP before saving
            const hashedOTP = await bcrypt.hash(otp, 10);
            
            // Save the OTP and expiry
            user.resetPasswordOTP = hashedOTP;
            user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            await user.save();

            // Send OTP email
            await emailService.sendResetPasswordEmail(user.email, otp, user.name);

            return {
                success: true,
                message: 'OTP has been sent to your email:'+ email
            };
        } catch (error) {

            user.resetPasswordOTP = null;
            user.resetPasswordExpires = null;
            await user.save({ validate: false });

            console.error('Forgot password error:', error);
            throw error instanceof Error ? error : new Error('Forgot password request failed');
        }
    }

    async resetPassword(request) {
        try {
            const { email, otp, newPassword } = request;

            // Find user and validate
            const user = await UserMongooseModel.findOne({ 
                email: email.trim().toLowerCase(),
                authProvider: 'email'
            });

            if (!user) {
                throw new NoRecordFoundError('User not found');
            }

            if (!user.resetPasswordOTP) {
                throw new BadRequestParameterError('No OTP found for this user');
            }

            if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
                throw new BadRequestParameterError('OTP expired');
            }

            // Verify the OTP
            const isValidOTP = await bcrypt.compare(otp, user.resetPasswordOTP);
            if (!isValidOTP) {
                throw new BadRequestParameterError('Invalid OTP');
            }

            // Update password and clear reset fields
            user.password = newPassword;
            user.resetPasswordOTP = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            return {
                success: true,
                message: 'Password has been reset successfully'
            };
        } catch (error) {
            console.error('Reset password error:', error);
            throw error instanceof Error ? error : new Error('Password reset failed');
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
                user: this.sanitizeUser(foundUser)
            };
        } catch (error) {
            // Handle errors more gracefully with custom errors
            throw new Error(error.message || 'Failed to get user details');
        }
    }

    async updateDetails(request, user) {
        try {
            const { uid } = user.decodedToken;
            const { name } = request;
    
            if (!name) {
                throw new BadRequestParameterError('Name is required for update');
            }
    
            const existingUser = await UserMongooseModel.findById(uid);
            if (!existingUser) {
                throw new NoRecordFoundError('User not found');
            }
    
            // Update name
            existingUser.name = name.trim().replace(/\s+/g, ' ');
    
            await existingUser.save();
    
            return {
                success: true,
                message: 'User details updated successfully',
                user: this.sanitizeUser(existingUser)
            };
        } catch (error) {
            throw error;
        }
    }

    async initiatePhoneUpdate(request, user) {
        try {
            const { uid } = user.decodedToken;
            const { phone } = request;
    
            if (!phone) {
                throw new BadRequestParameterError('Phone number is required');
            }
    
            const trimmedPhone = phone.trim();
    
            const existingUser = await UserMongooseModel.findById(uid);
            if (!existingUser) {
                throw new NoRecordFoundError('User not found');
            }
    
            // Case 1: Phone is already verified for this user
            if (existingUser.isPhoneVerified && trimmedPhone === existingUser.phone) {
                return {
                    success: true,
                    message: 'This phone number is already verified for your account',
                    requiresPhoneVerification: false
                };
            }
    
            // Case 2: Check if phone is used by another user
            const phoneExists = await UserMongooseModel.findOne({ 
                _id: { $ne: uid }, 
                phone: trimmedPhone
            });
            
            if (phoneExists) {
                throw new ConflictError('Phone number already in use');
            }
    
            // Case 3: Current user's existing phone needs verification
            // Case 4: New phone number needs verification
            // Both cases handled the same way:
    
            // Store the phone number temporarily
            existingUser.pendingPhone = trimmedPhone;
            
            // Send verification OTP
            const response = await this.sendPhoneVerificationOtp({ phone: trimmedPhone });

            if (response?.error && Object.keys(response?.error).length > 0) {
                throw new BadRequestParameterError('Failed to send verification code');
            }
    
            existingUser.phoneVerifyId = response.data.verify_id;
            await existingUser.save();
    
            return {
                success: true,
                message: `Verification code sent to ${trimmedPhone}`,
                requiresPhoneVerification: true
            };
        } catch (error) {
            throw error;
        }
    }

    async verifyPhoneVerification(request, user) {
        try {
            const { otp } = request;
            const { uid } = user.decodedToken;
    
            const existingUser = await UserMongooseModel.findById(uid);
            if (!existingUser) {
                throw new NoRecordFoundError('User not found');
            }
    
            if (!existingUser.pendingPhone || !existingUser.phoneVerifyId) {
                throw new BadRequestParameterError('No pending phone verification found');
            }
            
            if(existingUser.isPhoneVerified) {
                throw new BadRequestParameterError('Phone number already verified');
            }
            
            // Verify OTP
            const response = await this.verifyPhoneVerificationOtp(existingUser.verifyId, otp);
            if (response?.error && Object.keys(response?.error).length > 0) {
                throw new BadRequestParameterError('Invalid verification code');
            }
    
            // Update phone number after verification
            existingUser.phone = existingUser.pendingPhone;
            existingUser.pendingPhone = undefined;
            existingUser.phoneVerifyId = undefined;
            existingUser.isPhoneVerified = true;
            await existingUser.save();
    
            return {
                success: true,
                message: 'Phone number updated and verify successfully',
                user: this.sanitizeUser(existingUser)
            };
        } catch (error) {
            throw error;
        }
    }
    
    async updatePassword(request, user) {
        try {
            const { currentPassword, newPassword, confirmPassword } = request;
            const { uid } = user.decodedToken;
    
            const existingUser = await UserMongooseModel.findById(uid).select('+password');
            if (!existingUser) {
                throw new NoRecordFoundError('User not found');
            }
    
            // Additional check for email-based authentication
            if (existingUser.authProvider !== 'email') {
                throw new BadRequestParameterError('Password update is only available for email-based accounts');
            }
    
            const isPasswordValid = await existingUser.isPasswordCompare(currentPassword);
            if (!isPasswordValid) {
                throw new BadRequestParameterError('Current password is incorrect');
            }
    
            if (newPassword !== confirmPassword) {
                throw new BadRequestParameterError('Password does not match');
            }
    
            existingUser.password = newPassword;
            await existingUser.save();
    
            return {
                success: true,
                message: 'Password updated successfully'
            };
        } catch (error) {
            throw error;
        }
    }

    async signInWithApple(request, deviceInfo) {
        try {
            const { identityToken, authorizationCode, name, fcmToken } = request;

            // Verify Apple token
            let decodedToken;
            try {
                decodedToken = await this.verifyAppleToken(identityToken);
            } catch (error) {
                throw new BadRequestParameterError('Invalid Apple token');
            }

            const { sub: appleUserId,email,email_verified,name: appleName } = decodedToken;

            if (!email_verified) {
                throw new BadRequestParameterError('Apple account email is not verified');
            }

            if (!email) {
                throw new BadRequestParameterError('Email is required for Apple sign-in');
            }

            // Step 2: Check if user exists in the database
            let user = await UserMongooseModel.findOne({ email });

            if (user && user.authProvider !== 'apple') {
                throw new ConflictError('Email already registered with different auth provider');
            }
            
            if (!user) {
                // Step 3: If user doesn't exist, create a new one
                // Note: appleUser might contain firstName and lastName on first sign-in
                if(!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50){
                    throw new BadRequestParameterError('Name must be between 2 and 50 characters');
                }

                const userName = appleName?.name ? 
                    `${appleName.name.firstName || ''} ${appleName.name.lastName || ''}`.trim() : 
                    null;

                user = await UserMongooseModel.create({
                    name: userName || name,
                    email,
                    authProvider: 'apple',
                    providerId: appleUserId,
                    isEmailVerified: true,
                    status: 'active',
                    lastLogin: new Date(),
                    fcmTokens: fcmToken ? [{ token: fcmToken, device: deviceInfo, lastUsed: new Date() }] : []
                });
            } else {
                // Step 4: If user exists, update the provider ID and last login time
                user.providerId = appleUserId;
                user.lastLogin = new Date();
                user.status = 'active';

                if(name && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50)){
                    throw new BadRequestParameterError('Name must be between 2 and 50 characters');
                }

                // Update name if provided and user doesn't have one
                if (name && !user.name) {
                    user.name = name;
                }

                // Step 5: Update the FCM token if provided
                if (fcmToken) {
                    const existingToken = user.fcmTokens.find(t => t.token === fcmToken);
                    if (!existingToken) {
                        user.fcmTokens.push({ token: fcmToken, device: deviceInfo, lastUsed: new Date() });
                    } else {
                        existingToken.device = deviceInfo;
                        existingToken.lastUsed = new Date();
                    }
                }

                await user.save();
            }

            // Step 6: Generate access token for the user
            const { accessToken } = user.generateAccessToken();
            return { message: 'Sign-in successful', user: this.sanitizeUser(user), accessToken };

        } catch (error) {
            throw new Error(error.message || 'Apple sign-in failed');
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
            throw new Error(error.message || 'Failed to send push notification');
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
            const MAX_TOKENS = 5; // Adjust as needed
            if (currentUser.fcmTokens.length >= MAX_TOKENS) {
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
            throw new Error(error.message || 'Failed to update FCM token');
        }
    }
}

export default UserService;