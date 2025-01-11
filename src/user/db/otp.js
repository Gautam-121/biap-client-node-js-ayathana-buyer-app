import mongoose from 'mongoose'

const OtpSchema = new mongoose.Schema(
    {
        phone: { type: String , required: true},
        verifyId: { type : String , required: true},
        lastVerificationAttempt: { type: Date, default: null },
    },
    
)
const OTP = mongoose.model("otp" , OtpSchema)

export default OTP