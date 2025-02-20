import mongoose from'mongoose';
import { uuid } from 'uuidv4';
import OrderHistory from "../../order/v2/db/orderHistory.js";

// const transactionSchema = new mongoose.Schema({
//     _id:{
//         type: String,
//         required:true,
//         default: () => uuid(),
//     },
//     amount: { 
//         type:Number,
//     },
//     transactionId: { 
//         type:String,
//     },
//     date: {
//         type:Number,
//     },
//     status: { 
//         type:String,
//     },
//     orderId: { 
//         type:String,
//     },
//     humanReadableID: { 
//         type:String,
//     },
//     depositDate: {
//         type: Number,
//     },
//     payment: { 
//         type: Object,
//     }
// },{
//     strict: true,
//     collation: { locale: 'en_US', strength: 1 }
// });

const transactionSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        default: () => uuid(),
    },
    amount: { 
        type: Number,
        required: true
    },
    merchantTxnId: {  // merchant generated Id 
        type: String,
        required: true
    },
    parentTransactionId: { 
        type: String, // Reference to the parent transaction
        required: false
    },
    status: { 
        type: String,
        enum: ['INITIALIZE-PAYMENT', 'SUCCESS', 'FAILED', "PENDING", 'REFUNDED'],
        default: 'INITIALIZE-PAYMENT'
    },
    orderId: { 
        type: String // For single-order transactions
    },
    paymentId:{ // phone generated id
        type:String
    },
    orderTransactionIds: { 
        type: [String], // For multi-seller transactions
        default: []
    },
    payment: { 
        type: Object
    },
    refundedAmount: { 
        type: Number, 
        default: 0 // Tracks the total amount refunded
    }
}, {
    strict: true,
    collation: { locale: 'en_US', strength: 1 }
});


const Transaction = mongoose.model('Transaction',transactionSchema);
export default Transaction;

