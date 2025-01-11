import mongoose from "mongoose";

const InterestSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'invited', 'registered', 'rejected'],
            default: 'pending'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        approvedAt: Date,
        invitedAt: Date,
        inviteCode: String,
        inviteExpiry: Date
    }
);


const INTEREST = mongoose.model("Interest", InterestSchema);

export default INTEREST;