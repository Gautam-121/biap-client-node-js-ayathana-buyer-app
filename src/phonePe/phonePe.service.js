import Transaction from '../razorPay/db/transaction.js';
import Order from '../order/v1/db/order.js';
import crypto from 'crypto';
import BadRequestParameterError from '../lib/errors/bad-request-parameter.error.js';
// import ConfirmOrderService from "../order/v2/confirm/confirmOrder.service.js";
import axios from 'axios';
import NoRecordFoundError from '../lib/errors/no-record-found.error.js';
import RefundModel from '../razorPay/db/refund.js';
import mongoose from "mongoose"
// const confirmOrderService = new ConfirmOrderService();

class PhonePeService {
  constructor(confirmOrderService) {
    this.confirmOrderService = confirmOrderService
    this.merchantId = process.env.PHONEPE_MERCHANT_ID || "PGTESTPAYUAT78";
    this.saltKey = process.env.PHONEPE_SALT_KEY || "b843d817-f5e8-4d36-8917-1c6e045a1af9";
    this.saltIndex = process.env.PHONEPE_SALT_INDEX || 1;
    this.baseUrl = process.env.PHONEPE_API_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";
    this.appUrl = process.env.APP_URL || "https://preprod.xircular.io";
  }

  // Utility function to calculate checksum
  _calculateChecksum(base64Body , apiEndPoint) {
    const hash = crypto.createHash("sha256");
    hash.update(base64Body + apiEndPoint + this.saltKey);
    return hash.digest("hex") + "###" + this.saltIndex;
  }

  // Utility function to verify webhook signature
  _verifyWebhookSignature(signature, payload) {
    const calculatedSignature = crypto
      .createHmac("sha256", this.saltKey)
      .update(JSON.stringify(payload))
      .digest("hex");

    return signature !== calculatedSignature;
  }

  // Helper method to fetch payment status from PhonePe
  async _fetchPaymentStatus(merchantTransactionId, calculatedChecksum) {
    try {
      // Prepare PhonePe API request
      const phonepeStatusEndpoint = `${this.baseUrl || "https://api-preprod.phonepe.com/apis/pg-sandbox"}/pg/v1/status/${this.merchantId}/${merchantTransactionId}`;

      const requestOptions = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": calculatedChecksum + "###" + this.saltIndex,
          "X-MERCHANT-ID": this.merchantId,
        },
      };

      // Fetch payment status from PhonePe
      const response = await fetch(phonepeStatusEndpoint, requestOptions);

      // Check response status
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`PhonePe API Error: ${response.status} - ${errorBody}`);
      }

      // Parse response
      const paymentResponse = await response.json();

      // Validate PhonePe response
      if (!paymentResponse || !paymentResponse.code) {
        throw new Error("Invalid PhonePe API response");
      }

      // Map PhonePe status codes to standardized response
      const statusMapping = {
        PAYMENT_SUCCESS: {
          code: "PAYMENT_SUCCESS",
          message: "Payment Successful",
          isSuccess: true,
        },
        PAYMENT_PENDING: {
          code: "PAYMENT_PENDING",
          message: "Payment is pending",
          isSuccess: false,
        },
        PAYMENT_ERROR: {
          code: "PAYMENT_ERROR",
          message: "Payment failed",
          isSuccess: false,
        },
      };

      // Return standardized status
      return {
        code: paymentResponse.code,
        message:
          statusMapping[paymentResponse.code]?.message ||
          "Unknown payment status",
        data: paymentResponse.data,
        isSuccess: statusMapping[paymentResponse.code]?.isSuccess || false,
      };
    } catch (error) {
      // Log detailed error for debugging
      console.error("[PhonePe Payment Status Fetch Error]", {
        merchantTransactionId,
        errorMessage: error.message,
        errorStack: error.stack,
      });

      // Rethrow or return error response based on your error handling strategy
      return {
        error: true,
        code: "FETCH_ERROR",
        message: error.message,
        isSuccess: false,
      };
    }
  }

  // Helper methods for refund functionality
  async _createRefundRecord(data , session) {
    const refund = new RefundModel({
      ...data,
      attempts: 1,
      createdAt: new Date(),
    });
    return await refund.save({ session });
  }

  async _updateRefundRecord(refundId, updateData, session) {
    return await RefundModel.findByIdAndUpdate(
      refundId,
      { ...updateData, updatedAt: new Date() },
      { new: true , session: session }
    );
  }

  async _processRefundWithRetry(refundRecord , sellerTransaction ,  attempt = 1 , session) {
    try {

      // Create Refund Payload
      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId: refundRecord.refundTransactionId,
        originalTransactionId: refundRecord.originalTransactionId,
        amount: Math.round(refundRecord.amount * 100), // Convert to paisa
        callbackUrl: `${this.appUrl}/clientApis/v2/phonepe/refund-webhook`,
      };

      // Encode Payload to Base64
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
      const refundEndPoint = "/pg/v1/refund"
      // Generate checksum for refund
      const checksum = this._calculateChecksum(base64Payload , refundEndPoint);

       // Make refund request to PhonePe
      const response = await axios.post(
        `${this.baseUrl}${refundEndPoint}`,
        { request: base64Payload },
        {
            headers: {
                "Content-Type": "application/json",
                "X-VERIFY": checksum,
            },
        }
      );

      // Extract PhonePe's refund transaction ID
      const phonePeRefundId = response.data?.data?.transactionId;

      // Update refund record with PhonePe response
      await this._updateRefundRecord(
        refundRecord._id, 
        {
          status: response.code === "PAYMENT_PENDING" ? "PROCESSING" : response.code === "PAYMENT_SUCCESS" ? "COMPLETED" : "FAILED",
          refundId: phonePeRefundId, // Store PhonePe's refund transaction ID
          response: response?.data,
          lastAttempt: new Date(),
          attempts: attempt,
        },
        session
    );

      // Update seller transaction status
      if (response.code === "PAYMENT_SUCCESS") {
        sellerTransaction.status = "REFUNDED";
        await sellerTransaction.save({ session });
      }

      return response

    } catch (error) {

      // Retry logic
      if (attempt < 3) {
        console.log(`Refund attempt ${attempt} failed, retrying...`);
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
        return this._processRefundWithRetry(refundRecord, sellerTransaction, attempt + 1);
      }

      // Update refund record with failure after all retries
      await this._updateRefundRecord(
        refundRecord._id, 
        {
          status: "FAILED",
          errorMessage: error.message || "INTERNAL SERVER ERROR",
          lastAttempt: new Date(),
          attempts: attempt,
        },
        session
      );

      return 
    }
  }

  async processSellerTransactions(parentTransaction , session) {
    try {
        // Fetch all orders associated with the parent transaction
        const orders = await Order.find({ transactionId: { $in: parentTransaction.orderTransactionIds } }).session(session);;

        // Create or update seller-specific transactions
        for (const order of orders) {
            // Check if the seller-specific transaction already exists
            const existingTransaction = await Transaction.findOne({ orderId: order.transactionId }).session(session);;

            // Prepare the update object
            const updateObject = {
                amount: Number(order.quote.price.value),
                status: "SUCCESS",
                payment: parentTransaction.payment, // Inherit payment details from parent
                paymentId: parentTransaction.paymentId || null, // Store seller-specific paymentId here
                parentTransactionId: parentTransaction.merchnatTxnId, // Link to parent transaction
                updatedAt: Date.now(), // Always update the timestamp
            };

            // Add merchnatTxnId only if the transaction is being created
            if (!existingTransaction) {
                updateObject.orderId = order.transactionId
                updateObject.merchantTxnId = `SELLER_TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                updateObject.createdAt = Date.now(); // Set createdAt only for new transactions
            }

            // Create or update the seller-specific transaction
            await Transaction.findOneAndUpdate(
                { orderId: order.transactionId },
                updateObject,
                { upsert: true, new: true , session}
            );
        }
    } catch (error) {
        console.error("[Seller Transaction Processing Error]", error);
        throw error;
    }
  }

  async createSinglePaymentForMultiSellers(transactionIds, totalAmount, user) {
    let session;
    try {

        session = await mongoose.startSession()
        session.startTransaction(); // Begin the transaction

        // Validate input
        if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
            throw new BadRequestParameterError("Invalid or missing transaction IDs");
        }

        const orders = [];
        let calculatedTotalAmount = 0;

        // Fetch and validate all orders
        for (const transactionId of transactionIds) {
            const order = await Order.findOne({ transactionId }).session(session);
            if (!order) {
                throw new BadRequestParameterError(`Invalid transaction ID: ${transactionId}`);
            }
            if (!order.quote || !order.quote.price || !order.quote.price.value) {
                throw new BadRequestParameterError(`Quote price missing for order: ${transactionId}`);
            }

            // Add order to the list and calculate total amount
            orders.push(order);
            calculatedTotalAmount += Number(order.quote.price.value);
        }

        // Validate total amount
        if (calculatedTotalAmount !== totalAmount) {
            throw new BadRequestParameterError(
                `Amount mismatch: Expected ₹${calculatedTotalAmount}, received ₹${totalAmount}`
            );
        }

        // Generate a single merchant transaction ID for the entire payment
        const merchantTransactionId = `PHONEPE_${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}`;

        const payload = {
            merchantId: this.merchantId,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: user.decodedToken.uid,
            amount: totalAmount * 100, // Convert to paise
            mobileNumber: user.data.phone,
            callbackUrl: `${this.appUrl}/clientApis/v2/phonepe/webhook`,
            paymentInstrument: {
                type: "PAY_PAGE",
            },
        };

        // Encode Payload to Base64
        const base64Body = Buffer.from(JSON.stringify(payload)).toString("base64");
        const payEndPoint = "/pg/v1/pay";

        // Calculate Checksum
        const checksum = this._calculateChecksum(base64Body, payEndPoint);

        // Create a single transaction record for the total payment
        const totalTransaction = new Transaction({
            amount: totalAmount,
            merchantTxnId: merchantTransactionId,
            orderId: null, // This is the parent transaction
            orderTransactionIds: transactionIds, // Store the transaction IDs of all seller orders
            status: "INITIALIZE-PAYMENT",
            createdAt: Date.now(),
        });

        // Save the total transaction within the session
        await totalTransaction.save({ session });

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return platform-specific response
        return {
            success: true,
            statusCode: 200,
            message: "Payment initialized for all sellers",
            payload: base64Body,
            checksum,
            apiEndpoint: payEndPoint,
            merchantTransactionId,
        };
    } catch (error) {

        if(session){
          // Rollback the transaction in case of an error
          await session.abortTransaction();
          session.endSession();
        }

        if (error instanceof BadRequestParameterError) {
            throw error;
        }
        console.error("[PhonePe Multi-Seller Payment Error]", error);
        throw error;
    }
}
  
async processPaymentWebhook(signature, encodedResponse) {
  let session;
  try {
      
      session = await mongoose.startSession()
      session.startTransaction()

      // Step 1: Verify the webhook signature
      const verify = this._verifyWebhookSignature(signature, encodedResponse);

      if (!verify) {
        throw new BadRequestParameterError("Invalid webhook signature");
      }

      // Step 2: Decode base64 response and parse JSON
      const decodedPayload = JSON.parse(
        Buffer.from(encodedResponse, "base64").toString()
      );

      if (!decodedPayload || !decodedPayload?.data) {
        throw new BadRequestParameterError("Invalid webhook signature");
      }

      // Step 3: Find the parent transaction using merchantTransactionId
      const parentTransaction = await Transaction.findOne({
        merchantTxnId: decodedPayload?.data?.merchantTransactionId,
      }).session(session); // Use the session;
      if (!parentTransaction) {
        throw new NoRecordFoundError("Parent transaction not found");
      }

      // Step 4: Update parent transaction status based on PhonePe event state
      switch (decodedPayload.code) {
        case "PAYMENT_SUCCESS":
            parentTransaction.status = "SUCCESS";
            parentTransaction.payment = decodedPayload.data?.paymentInstrument;
            parentTransaction.paymentId = decodedPayload.data?.transactionId
            break;
        case "PAYMENT_ERROR":
            parentTransaction.status = "FAILED";
            break;
        case "PAYMENT_PENDING":
            parentTransaction.status = "PENDING";
            break;
        default:
            parentTransaction.status = "FAILED";
            break;
     }

     // Save the updated parent transaction within the session
     await parentTransaction.save({ session });

      // Step 5: Process seller-specific transactions if payment is successful
      if (parentTransaction.status === "SUCCESS") {
        await this.processSellerTransactions(parentTransaction, session); // Pass the session
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return { success: true, message: "Payment processed successfully" };
  } catch (error) {

      if(session){
        await session.abortTransaction();
        session.endSession();
      }

      if (error instanceof BadRequestParameterError) {
          throw error;
      }
      console.error("[PhonePe Webhook Processing Error]", error);
      throw error;
  }
}
 
  async paymentStatusForMultiSeller(merchantTransactionId) {
    let session;
    try {
        // Start a new database session
        session = await mongoose.startSession();
        session.startTransaction();

        // Step 1: Find the parent transaction using merchantTransactionId
        const parentTransaction = await Transaction.findOne({
            merchantTxnId: merchantTransactionId,
        }).session(session);

        if (!parentTransaction) {
            throw new NoRecordFoundError("Parent transaction not found");
        }

        // Step 2: Prepare checksum verification
        const string = `/pg/v1/status/${this.merchantId}/${merchantTransactionId}${this.saltKey}`;
        const calculatedChecksum = crypto.createHash("sha256").update(string).digest("hex");

        // Step 3: Fetch payment status from PhonePe
        const paymentStatus = await this._fetchPaymentStatus(
            merchantTransactionId,
            calculatedChecksum
        );

        // Step 4: Validate the payment status response
        if (!paymentStatus || paymentStatus?.error) {
            throw new Error(paymentStatus.message || "PhonePe API Error");
        }

        // Step 5: Update parent transaction status based on PhonePe event state
        switch (paymentStatus.code) {
            case "PAYMENT_SUCCESS":
                parentTransaction.status = "SUCCESS";
                parentTransaction.payment = paymentStatus.data?.paymentInstrument;
                parentTransaction.paymentId = paymentStatus.data?.transactionId; // Store the main payment ID
                break;
            case "PAYMENT_ERROR":
                parentTransaction.status = "FAILED";
                break;
            case "PAYMENT_PENDING":
                parentTransaction.status = "PENDING";
                break;
            default:
                parentTransaction.status = "FAILED";
                break;
        }

        // Save the updated parent transaction
        await parentTransaction.save({ session });

        // Step 6: Process seller-specific transactions if payment is successful
        if (parentTransaction.status === "SUCCESS") {
            await this.processSellerTransactions(parentTransaction , session);
        }
 
        // Step 7: Confirm order if payment is successful
        if (parentTransaction.status === "SUCCESS") {

          // Step 7: Construct the response in the required format
          const orders = await Order.find({ transactionId: { $in: parentTransaction.orderTransactionIds } }).session(session);;
          const responseData = orders.map(order => ({
            context: {
                domain: order.domain,
                city: order.city, // Replace with actual city code if available
                parent_order_id: order.parentOrderId || parentTransaction.transactionId, // Parent order ID
                transaction_id: order.transactionId, // Transaction ID for the specific order
            },
            message: {
                payment: {
                    paid_amount: order?.quote?.price?.value, // Paid amount for the specific order
                    type: order?.payment?.type || "ON-ORDER", // Payment type
                    status: order?.payment?.status, // Payment status
                    "@ondc/org/settlement_basis": order?.settlementDetails["@ondc/org/settlement_basis"],
                    "@ondc/org/settlement_window": order?.settlementDetails["@ondc/org/settlement_window"], // Settlement window
                    "@ondc/org/withholding_amount": order?.settlementDetails["@ondc/org/withholding_amount"], // Withholding amount @ondc/org/withholding_amount
                },
                providers: {
                    id: order.provider.id, // provider ID
                },
            },
          }));

            // Commit current transaction before starting new one
            await session.commitTransaction();
            session.endSession();
            session = null;

            return await this.confirmOrderService.confirmMultipleOrder(
                responseData,
                merchantTransactionId,
            );
        }

        // For non-successful payments, commit and return status
        await session.commitTransaction();
        return {
            status: paymentStatus.data?.code || 400,
            merchantTransactionId,
            message: paymentStatus.message,
        };
    } catch (error) {
        if(session){
          await session.abortTransaction();
        }
        if (error instanceof NoRecordFoundError) {
            throw error;
        }
        console.error("[Payment Verification Error]", error);
        throw error;
    } finally{
        if(session){
          session.endSession()
        }
    }
}

  async createPayments(transactionId, data, user) {
    try {
      // Validate order
      const intent = await Order.findOne({ transactionId });
      if (!intent) throw new BadRequestParameterError("Invalid transaction ID");

      if(!intent || !intent?.quote || !intent?.quote?.price || !intent?.quote?.price?.value){
        throw new BadRequestParameterError("quote price amount missing")
      }

      // Convert order amount
      const orderAmount = Number(intent.quote.price.value);
      const requestAmount = Number(data.amount);

      // Strict amount validation
      if (orderAmount !== requestAmount) {
        throw new BadRequestParameterError(
          `Amount mismatch: Expected ₹${orderAmount} , received ${requestAmount}`
        );
      }

      // Generate unique merchant transaction ID
      const merchantTransactionId = `PHONEPE_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;

      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId: merchantTransactionId,
        merchantUserId: user.decodedToken.uid,
        amount: requestAmount * 100,
        mobileNumber: user.data.phone,
        callbackUrl: `${this.appUrl}/clientApis/v2/phonepe/webhook`,
        paymentInstrument: {
          type: "PAY_PAGE",
        },
      };

      // Encode Payload to Base64
      const base64Body = Buffer.from(JSON.stringify(payload)).toString("base64");
      const payEndPoint = "/pg/v1/pay"

      // Calculate Checksum
      const checksum = this._calculateChecksum(base64Body , payEndPoint);

      // Create transaction record
      const transaction = new Transaction({
        amount: data.amount,
        transactionId,
        orderId: merchantTransactionId,
        merchantUserId: user.decodedToken.uid,
        status: "INITIALIZE-PAYMENT",
        createdAt: Date.now(),
      });

      // Save transaction
      await transaction.save();

      // Return platform-specific response
      return {
        success: true,
        statusCode: 200,
        payload: base64Body,
        checksum,
        apiEndpoint: payEndPoint,
        merchantTransactionId,
      };
    } catch (error) {
      if(error instanceof BadRequestParameterError){
        throw error
      }
      console.error("[PhonePe Payment Error]", error);
      throw error;
    }
  }

  async handleInitializePaymentWebhook(signature, encodedResponse) {
    try {
      // Step 1: Verify the webhook signature
      const verify = this._verifyWebhookSignature(signature, encodedResponse);

      if (!verify) {
        throw new BadRequestParameterError("Invalid webhook signature");
      }

      // Step 2: Decode base64 response and parse JSON
      const decodedPayload = JSON.parse(
        Buffer.from(encodedResponse, "base64").toString()
      );

      if (!decodedPayload || !decodedPayload?.data) {
        throw new BadRequestParameterError("Invalid webhook signature");
      }

      // Step 3: Find Transaction details using merchantTransactionId
      const orderTransaction = await Transaction.findOne({
        orderId: decodedPayload?.data?.merchantTransactionId,
      });

      if (!orderTransaction) {
        throw new NoRecordFoundError("Order not found");
      }

      // Update transaction status based on PhonePe event state
      switch (decodedPayload.code) {
        case "PAYMENT_SUCCESS":
          orderTransaction.status = "TXN_SUCCESS";
          orderTransaction.payment = decodedPayload.data?.paymentInstrument;
          break;
        case "PAYMENT_ERROR":
          orderTransaction.status = "TXN_FAILURE";
          break;
        case "PAYMENT_PENDING":
          orderTransaction.status = "TXN_PENDING";
          break;
        default:
          orderTransaction.status = "TXN_FAILURE";
          break;
      }

      // Save the updated transaction status
      await orderTransaction.save();

      // Return the updated order
      return orderTransaction;
    } catch (error) {
      if(error instanceof BadRequestParameterError){
        throw error
      }
      console.error("[Webhook Error]", error);
      throw error;
    }
  }

  async paymentStatus(merchantTransactionId, confirmdata) {
    try {
      // Find Transaction Detail using merchantTransactionId
      const orderTransaction = await Transaction.findOne({
        orderId: merchantTransactionId,
      });

      if (!orderTransaction) {
        throw new NoRecordFoundError("Order transaction not found");
      }

      // Prepare checksum verification
      const string = `/pg/v1/status/${this.merchantId}/${merchantTransactionId}${this.saltKey}`;
      const calculatedChecksum = crypto.createHash("sha256").update(string).digest("hex");

      // Get payment status from PhonePe
      const paymentStatus = await this._fetchPaymentStatus(
        merchantTransactionId,
        calculatedChecksum
      );

      // Handle different payment status scenarios
      if (!paymentStatus || paymentStatus?.error) {
        throw new Error(paymentStatus.message || "PhonePe Api Error");
      }

      // Update transaction status based on PhonePe event state
      const statusMapping = {
        PAYMENT_SUCCESS: {
          dbStatus: "TXN_SUCCESS",
          processOrder: true,
        },
        PAYMENT_ERROR: {
          dbStatus: "TXN_FAILURE",
          processOrder: false,
        },
        PAYMENT_PENDING: {
          dbStatus: "TXN_PENDING",
          processOrder: false,
        },
        DEFAULT: {
          dbStatus: "TXN_FAILURE",
          processOrder: false,
        },
      };

      const statusHandler =
        statusMapping[paymentStatus.code] || statusMapping["DEFAULT"];

      // Update transaction status
      orderTransaction.status = statusHandler.dbStatus;
      orderTransaction.payment = paymentStatus.data?.paymentInstrument || null;
      orderTransaction.paymentId = orderTransaction.paymentId
        ? orderTransaction.paymentId
        : paymentStatus?.data?.transactionId;
      await orderTransaction.save();

      // Handle order confirmation or return error
      if (!statusHandler.processOrder) {
        return {
          status: paymentStatus.data?.code || 400,
          merchantTransactionId,
          message: paymentStatus.message,
        };
      }

      // Confirm order if payment is successful
      return await this.confirmOrderService.confirmMultipleOrder(
        confirmdata,
        merchantTransactionId
      );
    } catch (error) {
      if(error instanceof NoRecordFoundError){
        throw error
      }
      console.error("[Payment Verification Error]", error);
      throw error;
    }
  }
  
  async initiateRefund(sellerOrderId, refundAmount,existingSession = null) {

    // Use existing session if provided, otherwise create new one
    const session = existingSession || await mongoose.startSession();
    if (!existingSession) {
        session.startTransaction();
    }

    try {

      // Fetch the seller-specific transaction
      const sellerTransaction = await Transaction.findOne({ orderId: sellerOrderId }).session(session);;
      if (!sellerTransaction) {
          throw new NoRecordFoundError("Seller transaction not found");
      }

      // Fetch the parent transaction
      const parentTransaction = await Transaction.findOne({ merchantTxnId: sellerTransaction.parentTransactionId }).session(session);;
      if (!parentTransaction) {
          throw new NoRecordFoundError("Parent transaction not found");
      }

      // Validate refund amount
      if (refundAmount > sellerTransaction.amount) {
        throw new BadRequestParameterError("Refund amount exceeds seller's transaction amount");
      }

      if(sellerTransaction.status === "REFUNDED"){
        throw new BadRequestParameterError("Amount is already refunded")
      }

      // Generate unique refund transaction ID
      const refundTxnId = `REF_${sellerOrderId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create refund record with transaction
      const refundRecord = await this._createRefundRecord(
        {
            originalTransactionId: parentTransaction.merchnatTxnId,
            refundTransactionId: refundTxnId,
            sellerTransactionId: sellerTransaction.transactionId, // Seller-specific transaction ID
            parentTransactionId: parentTransaction.transactionId, // Parent transaction ID for reference
            amount: refundAmount,
            status: 'INITIATED',
            refundType: refundAmount === sellerTransaction.amount ? "FULL" : "PARTIAL"
        },
        session
    );

      // Initiate refund with retry mechanism
      const refundResult = await this._processRefundWithRetry(
        refundRecord,
        sellerTransaction,
        1,
        session
      );

      if (!refundResult) {
        console.error(`Refund failed for transactionId: ${sellerOrderId}`);
        // Log failure in database for manual intervention

        // Notify admin-support for manual action

      } else {
        // Update OrderModel based on refund status
        if (refundResult.code === "PAYMENT_PENDING") {
          await Order.findOneAndUpdate(
            { transactionId: sellerTransaction.orderId },
            {
              "refund.status": "PROCESSING",
              "refund.processingAt": new Date(),
              updatedAt: new Date(),
            },
            { session }
          );
        } else if (refundResult.code === "PAYMENT_SUCCESS") {
          await Order.findOneAndUpdate(
            { transactionId: sellerTransaction.orderId },
            {
              "payment.status": "REFUNDED",
              "refund.status": "COMPLETED",
              "refund.refundId": refundResult.data?.transactionId,
              "refund.amount": refundAmount,
              "refund.completedAt": new Date(),
              "state": "REFUNDED",
              updatedAt: new Date(),
            },
            { session }
          );

          // Update ParentTransaction
          const totalRefundedAmount = await Transaction.aggregate([
            {
              $match: {
                parentTransactionId: parentTransaction.merchnatTxnId,
                status: "REFUNDED",
              },
            },
            {
              $group: {
                _id: null,
                totalRefunded: { $sum: "$amount" },
              },
            },
          ]).session(session);;

          if (totalRefundedAmount[0]?.totalRefunded === parentTransaction.amount) {
            // Full refund: Update parent transaction status
            await Transaction.findOneAndUpdate(
              { merchnatTxnId: parentTransaction.merchnatTxnId },
              {
                status: "REFUNDED",
                updatedAt: new Date(),
              },
              { session }
            );
          } else {
            // Partial refund: Increment refunded amount in parent transaction
            await Transaction.findOneAndUpdate(
              { merchnatTxnId: parentTransaction.merchnatTxnId },
              {
                $inc: { refundedAmount: refundAmount },
                updatedAt: new Date(),
              },
              { session }
            );
          }
        } else {
          await Order.findOneAndUpdate(
            { transactionId: sellerTransaction.orderId },
            {
              "refund.status": "FAILED",
              "refund.failedAt": new Date(),
              updatedAt: new Date(),
            },
            { session }
          );
        }

        // Example: Notify user of refund Initiated (implement notification logic)

        // await this._sendRefundCompletionNotification(refundRecord.userId);

      }

      if (!existingSession) {
        await session.commitTransaction();
        session.endSession();
      }
      return refundResult;

    } catch (error) {
      console.error("[PhonePe Refund Error]", error);
      if (!existingSession) {
        await session.abortTransaction();
        session.endSession();
      }
      return 
    }
  }

async handleRefundWebhook(signature, encodedResponse) {
    try {
      // Step 1: Verify the webhook signature
      const isVerified = this._verifyWebhookSignature(signature, encodedResponse);
      if (!isVerified) {
        throw new BadRequestParameterError("Invalid refund webhook signature");
      }
  
      // Step 2: Decode the payload
      const decodedPayload = JSON.parse( Buffer.from(encodedResponse, "base64").toString());
  
      if (!decodedPayload?.data) {
        throw new BadRequestParameterError("Invalid refund webhook payload");
      }
  
      // Step 3: Find the refund record based on the merchantTransactionId
      const refundRecord = await RefundModel.findOne({
        refundTransactionId: decodedPayload.data.merchantTransactionId
      });
  
      if (!refundRecord) {
        throw new NoRecordFoundError("Refund record not found");
      }
  
      // Step 4: Determine the new refund status based on the response code
      let status;
      switch (decodedPayload.code) {
        case "PAYMENT_PENDING":
          status = "PROCESSING";
          break;
        case "PAYMENT_SUCCESS":
          status = "COMPLETED";
          break;
        default:
          status = "FAILED";
          break;
      }
  
      // Step 5: Update the refund record in the database
      await this._updateRefundRecord(refundRecord._id, {
        status,
        lastAttempt: new Date(),
        attempts: (refundRecord.attempts || 0) + 1,
      });
  
      // Step 6: Send notification if the refund is completed (TODO implementation)
      if (status === "COMPLETED") {
        // Example: Notify user of refund completion (implement notification logic)
        // await this._sendRefundCompletionNotification(refundRecord.userId);
      }
  
      // Return success response
      return { success: true, status };
    } catch (error) {
      console.error("[Refund Webhook Error]", error);
      // Re-throw error to propagate it up the chain or handle globally
      throw error;
    }
  }
  
}

export default PhonePeService