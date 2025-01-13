import axios from 'axios';
import ConflictError from '../lib/errors/conflict.error.js';
import NoRecordFoundError from '../lib/errors/no-record-found.error.js';
import BadRequestParameterError from '../lib/errors/bad-request-parameter.error.js';
import UnauthenticatedError from '../lib/errors/unauthenticated.error.js';
import Admin from "./db/admin.js"
import Interest from '../user/db/interest.js';
import EmailService from '../utils/email/email.service.js';

const emailService = new EmailService()

class AdminService {

    constructor() {
        this.KALEYRA_URL = process.env.KALEYRA_URL || 'https://api.kaleyra.io/v1';   
        this.KALEYRA_FROM_EMAIL =  process.env.KALEYRA_FROM_EMAIL
        this.KALEYRA_INVITE_TEMPLATE_ID =  process.env.KALEYRA_INVITE_TEMPLATE_ID
    }

    // Helper Methods
    sanitizeAdmin(user) {
        const userObject = user.toObject();
        delete userObject?.["__v"]
        delete userObject?.password
        return userObject;
    }

    // Helper function to send invite email using Kaleyra
    async sendInviteEmail(email, name, inviteCode) {
        try {
            const response = await axios.post(`${process.env.KALEYRA_BASE_URL}/messages/email/send`, {
                to: email,
                from: process.env.KALEYRA_FROM_EMAIL,
                subject: 'Welcome to Our Platform - Your Exclusive Invite',
                template_id: process.env.KALEYRA_INVITE_TEMPLATE_ID,
                data: {
                    name: name,
                    invite_code: inviteCode,
                    registration_link: `${process.env.FRONTEND_URL}/register?code=${inviteCode}`,
                    expiry_days: 7
                }
            }, {
                headers: {
                    'api-key': process.env.KALEYRA_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error sending invite email:', error);
            throw error;
        }
    }

    // Helper function to generateInvite Code
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

    async login(request) {
        try {
            // Destructure email and password from the request object
            const { email, password } = request;
    
            // Sanitize the email by trimming whitespace and converting to lowercase
            const sanitizedEmail = email.trim().toLowerCase();
    
            // Find the admin user in the database by the sanitized email
            const admin = await Admin.findOne({ email: sanitizedEmail });
    
            // If no admin is found, throw an UnauthenticatedError with a generic message
            if (!admin) {
                throw new NoRecordFoundError("Admin not found");
            }
    
            // Compare the provided password with the stored password
            const isPasswordCorrect = await admin.isPasswordCompare(password);
            // If the password is incorrect, throw an UnauthenticatedError with a generic message
            if (!isPasswordCorrect) {
                throw new UnauthenticatedError("Invalid Email or Password");
            }
    
            // Generate an access token for the admin user
            const token = await admin.generateAccessToken();
    
            // Return a success response with sanitized admin data and the generated token
            return {
                success: true,
                message: "Login Successful",
                data: this.sanitizeAdmin(admin), // Sanitize admin data to remove sensitive information
                token: token
            };
    
        } catch (error) {
            // Log the error details for debugging
            console.error('Error in login function:', {
                error: error.message,
                stack: error.stack
            });
            // If the error is an instance of UnauthenticatedError, rethrow it
            if (error instanceof UnauthenticatedError) throw error;
            // Throw a generic error message to the client, or use the provided error message
            throw new Error(error.message || "Error Processing login");
        }
    }

    async getInterested(request, user, query) {
        try {
            const { status, page = 1, limit = 10 } = query;
            
            // Validate and sanitize input
            const sanitizedPage = Math.max(parseInt(page), 1); // Ensure page is at least 1
            const sanitizedLimit = Math.max(parseInt(limit), 1); // Ensure limit is at least 1
            const queryResult = status ? { status } : {}; // Build query object based on status
            
            // Fetch the interest data with pagination
            const interest = await Interest.find(queryResult)
                .sort({ createdAt: -1 }) // Sort by creation date in descending order
                .skip((sanitizedPage - 1) * sanitizedLimit) // Skip records for pagination
                .limit(sanitizedLimit) // Limit the number of records fetched
                .select({ "__v": 0 }); // Exclude the `__v` field
            
            // Count the total records matching the query
            const totalRecords = await Interest.countDocuments(queryResult);
            
            return {
                success: true,
                data: interest, // Return the fetched data
                pagination: {
                    current: sanitizedPage, // Current page number
                    total: Math.ceil(totalRecords / sanitizedLimit), // Total number of pages
                    totalRecords: totalRecords // Total number of matching records
                }
            };
        } catch (error) {
            // Log the error details for debugging
            console.error('Error in getInterested function:', {
                error: error.message,
                stack: error.stack
            });
            throw new Error(error.message || "Error while fetching interested forms"); // Throw a generic error message
        }
    }
    
    async sendInvite(request, user, params) {
        let session = null;
    
        try {

            // Start transaction
            session = await mongoose.startSession();
            session.startTransaction();
            
            // Fetch the interest record with session
            const interest = await Interest.findById(
                params.id,
                null,
                { session, lean: false }  // Don't use lean as we need to modify the document
            );
            
            if (!interest) {
                throw new NoRecordFoundError(`Interest form not found with id: ${params.id}`);
            }

            if(interest.status === "invited" && interest.inviteExpiry && interest.inviteExpiry > new Date()){
                throw new BadRequestParameterError(`An active invite already exists and has not expired.`)
            }

            if(invite.staus === "registered"){
                throw new BadRequestParameterError("The invite email already complete registration")
            }
    
            // Generate Invite Code
            const inviteCode = this.generateInviteCode();
    
            // Update interest with invite details
            interest.inviteCode = inviteCode;
            interest.status = "invited";
            interest.invitedAt = new Date();
            interest.inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry
            await interest.save();
    
            // Send invite email
            await emailService.sendInviteEmail(interest.email, interest.name, inviteCode , interest.inviteExpiry );

            // Commit the transaction
            await session.commitTransaction();
            session.endSession()
    
            return {
                success: true,
                message: `Invite sent successfully to ${interest.email}`,
            };
        } catch (error) {
            if (session) {
                await session.abortTransaction();
                session.endSession()
            }
            // Log the error with context
            console.error('Error in sendInvite:', {
                error: error.message,
                stack: error.stack,
            });    
            if(error instanceof NoRecordFoundError) throw error
            else if(error instanceof BadRequestParameterError) throw error
    
            throw new Error(error.message || "Error while sending invite link");
        }
    }

}

export default AdminService;