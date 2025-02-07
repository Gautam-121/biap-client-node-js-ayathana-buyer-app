import mongoose from "mongoose";

const  FulfillmentsHistory = new mongoose.Schema(
    {
        orderId:{ type: String },
        type:{ type: String },
        state:{ type: Object },
        id:{ type: String },
        updatedAt:{ type: String }
    },
    { _id: true, timestamps: true }
);

FulfillmentsHistory.index({ orderId: 1, id: 1, state: 1 }, { unique: true });

const FulfillmentHistory  = mongoose.model('fulfillmentHistory', FulfillmentsHistory, "fulfillmentHistory");

export default FulfillmentHistory;