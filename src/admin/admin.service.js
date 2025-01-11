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

    async register(request) {
        try {
            const { name, email, password } = request
            const sanitizedName = name.trim().replace(/\s+/g, ' ')
            const sanitizedEmail = email.trim().toLowerCase()

            const existingAdmin = await Admin.findOne({ email: sanitizedEmail })

            if (existingAdmin) {
                throw new ConflictError("Email is already used")
            }

            const admin = await Admin.create({
                name: sanitizedName,
                email: sanitizedEmail,
                password: password
            })

            return {
                success: true,
                message: "Admin registered successfully",
                data: this.sanitizeAdmin(admin)
            }

        } catch (error) {

            if(error instanceof ConflictError){
                throw error
            }

            console.error('Admin registration error:', error);
            throw new Error(error.message || "Error Processing admin regitration")
        }
    }

    async login(request){
        try {
            const { email , password } = request
            const sanitizedEmail = email.trim().toLowerCase()
    
            const admin = await Admin.findOne({email: sanitizedEmail})
    
            if(!admin){
                throw new UnauthenticatedError("Invalid Email or Password")
            }
    
            const isPasswordCorrect = await admin.isPasswordCompare(password);
            if(!isPasswordCorrect){
                throw new UnauthenticatedError("Invalid Email or Password")
            }
    
            const token = await admin.generateAccessToken()
    
            return {
                success: true,
                message: "Login Successfull",
                data: this.sanitizeAdmin(admin),
                token: token
            }

        } catch (error) {

            if(error instanceof UnauthenticatedError){
                throw error
            }

            console.error("Login error:", error)
            throw new Error(error.message || "Error Proccessing login")
        }
    }

    async getInterested(request , user , query){
        try {
            const { status , page=1 , limit = 10 } = query
            const queryResult = status ? { status } : {}
    
            const interest = await Interest.find(queryResult)
                .sort({createdAt: -1})
                .skip((page-1)*limit)
                .limit(limit)
                .select({"__v": 0})

            const countRecods = await Interest.find(queryResult).count()
    
           return {
               success: true,
               data: interest,
               pagination:{
                  current: page,
                  total: Math.ceil(countRecods / limit),
                  totalRecords: countRecods
               }
           }
        } catch (error) {
            console.error("Fetching Interested forms" , error)
            throw new Error(error.message || "Error while fetching interested forms")
        }
    }

    async sendInvite(request, user, params) {
        let interest = null; 
        let previousState = {};
    
        try {
            // Fetch the interest record
            interest = await Interest.findById(params.id);
            
            if (!interest) {
                throw new NoRecordFoundError(`Interest form not found with id: ${params.id}`);
            }

            if(interest.status === "invited" && interest.inviteExpiry && interest.inviteExpiry > new Date()){
                throw new BadRequestParameterError( 
                    `An active invite already exists and has not expired. It will expire on ${interest.inviteExpiry.toLocaleString()}. Please wait until it expires before sending a new invite.`
                )
            }

            if(interest.status === "registered"){
                throw new BadRequestParameterError("The user has already been registered. No further action is required")
            }
    
            // Generate Invite Code
            const inviteCode = this.generateInviteCode();
    
            // Save the current state of interest for rollback purposes
            previousState = {
                status: interest.status,
                inviteCode: interest.inviteCode,
                invitedAt: interest.invitedAt,
                inviteExpiry: interest.inviteExpiry,
            };

    
            // Update interest with invite details
            interest.inviteCode = inviteCode;
            interest.status = "invited";
            interest.invitedAt = new Date();
            interest.inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry
            await interest.save();
    
            // Send invite email
            await emailService.sendInviteEmail(interest.email, interest.name, inviteCode , interest.inviteExpiry );
    
            return {
                success: true,
                message: `Invite sent successfully to ${interest.email}`,
            };
        } catch (error) {
            console.error("Error during sendInvite operation", error);
    
            // Rollback changes if any were made
            if (interest && interest.status === "invited") {
                try {
                    Object.assign(interest, previousState);
                    await interest.save();
                } catch (rollbackError) {
                    console.error("Error during rollback operation", rollbackError);
                }
            }

            if(error instanceof NoRecordFoundError) throw error
            else if(error instanceof BadRequestParameterError) throw error
    
            throw new Error(error.message || "Error while sending invite link");
        }
    }

    
}

export default AdminService;