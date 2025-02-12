import mongoose from 'mongoose';
import { uuid } from 'uuidv4';

const refundSchema = new mongoose.Schema({
    _id:{ // 
        type: String,
        required:true,
        default: () => uuid(),
    },
    originalTransactionId: { // 
        type: String,
        required: true
    },
    refundTransactionId: { // 
        type: String,
        required: true,
        unique: true
    },
    sellerTransactionId: { 
        type: String,
        required: true // Seller-specific transaction ID (e.g., SELLER_TXN_987654321)
    },
    parentTransactionId: { 
        type: String,
        required: true // Parent transaction ID for reference
    },
    refundId:{
        type:String
    },
    amount: { // 
        type: Number,
        required: true
    },
    status: { // 
        type: String,
        enum: ['INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED'],
        default: 'INITIATED'
    },
    refundType: { // 
        type: String,
        enum: ['FULL', 'PARTIAL'],
        required: true
    },
    attempts: { // 
        type: Number,
        default: 1
    },
    lastAttempt: {
        type: Date
    },
    response: {
        type: Object
    },
    errorMessage: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
});


const Refund = mongoose.model('Refund',refundSchema);
export default Refund;
