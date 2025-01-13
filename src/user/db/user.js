import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const UserSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true},
        email: { type: String,  trim: true, lowercase: true},
        phone: { type: String, default: null},
        pendingPhone: { type: String, default: null },
        status: { type: String, enum: ['active', 'pending', 'deleted'], default: 'pending' },
        authProvider: { type: String, enum: ['mobile', 'google', 'apple'], default: 'mobile' },
        providerId: { type: String, default: null },
        isPhoneVerified: { type: Boolean, default: false },
        isEmailVerified: {type: Boolean , default: false},
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
        gender: { type: String , enum: ['male', 'female', 'other', 'undisclosed'], default: 'undisclosed'},
        registeredAt: { type: Date, default: Date.now },
        isFirstLogin: {type: Boolean , default: true },
        lastLogin: { type: Date, default: null },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
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
                email: this.email,
                role: "USER"
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
