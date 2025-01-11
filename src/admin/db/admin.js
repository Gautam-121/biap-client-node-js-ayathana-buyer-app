import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken'

const AdminSchema =  new mongoose.Schema({

    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin'], default: 'Admin' },

  }, { timestamps: true });

// Hash password before saving to the database, only if the password field is provided
AdminSchema.pre("save", async function (next) {
    if (this.password && this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);  // Only hash if the password is set
    }
    next();
});

// Method to compare password
AdminSchema.methods.isPasswordCompare = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Method to generate access token
AdminSchema.methods.generateAccessToken = function () {
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d'; // Default to 7 days
    return jwt.sign(
        {
            decodedToken: {
                uid: this._id.toString(),
                email: this.email,
                role: "ADMIN"
            }
        },
        process.env.JWT_SECRET || 'your_access_token_secret',
        {
            expiresIn: expiresIn,
        }
    );
};


const ADMIN = mongoose.model('Admin', AdminSchema);

export default ADMIN
