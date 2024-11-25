import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const UserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true},
        email: { type: String, required: true, unique: true, trim: true, lowercase: true},
        password: { type: String, required: false, select: false },
        phone: { type: String, sparse: true},
        pendingPhone: { type: String, sparse: true },
        status: { type: String, enum: ['active', 'pending'], default: 'pending' },
        authProvider: { type: String, enum: ['email', 'google', 'apple'], default: 'email' },
        providerId: { type: String, sparse: true },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },
        fcmTokens: [{
            token: String,
            device: {
                type: { type: String, enum: ['ios', 'android', 'web'] },
                model: String,
                osVersion: String,
                appVersion: String
            },
            lastUsed: Date
        }],
        verifyId: { type: String, default: null },
        phoneVerifyId: { type: String, default: null },
        resetPasswordOTP: { type: String, select: false },
        resetPasswordExpires: { type: Date, select: false },
        lastLogin: Date,
        createdAt: { type: Date, default: Date.now },
        updatedAt: Date
    },
    { _id: true, timestamps: true }
);

// Hash password before saving to the database, only if the password field is provided
UserSchema.pre("save", async function (next) {
    if (this.password && this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);  // Only hash if the password is set
    }
    next();
});

// Method to compare password
UserSchema.methods.isPasswordCompare = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Method to generate access token
UserSchema.methods.generateAccessToken = function () {
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d'; // Default to 7 days
    return jwt.sign(
        {
            decodedToken: {
                uid: this._id.toString(),
                email: this.email
            }
        },
        process.env.JWT_SECRET || 'your_access_token_secret',
        {
            expiresIn: expiresIn,
        }
    );
};

const USER = mongoose.model("user", UserSchema);

export default USER;
