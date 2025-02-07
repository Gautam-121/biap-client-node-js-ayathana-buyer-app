import mongoose from "mongoose";

const  OrdersHistory = new mongoose.Schema(
    {
        orderId:{ type: String },
        updatedAt:{ type: String },
        state:{ type: Object },
        id:{ type: String }
    },
    { _id: true, timestamps: true }
);


OrdersHistory.index({ orderId: 1, state: 1 }, { unique: true });

const OrderHistory  = mongoose.model('ordersHistory', OrdersHistory, "ordersHistory");

export default OrderHistory;