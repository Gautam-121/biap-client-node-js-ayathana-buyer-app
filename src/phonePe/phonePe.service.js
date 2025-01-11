import Transaction from '../razorPay/db/transaction.js';
import Order from '../order/v1/db/order.js';
import crypto from 'crypto';
import BadRequestParameterError from '../lib/errors/bad-request-parameter.error.js';
import ConfirmOrderService from "../order/v2/confirm/confirmOrder.service.js";
import axios from 'axios';
import NoRecordFoundError from '../lib/errors/no-record-found.error.js';
import RefundModel from '../razorPay/db/refund.js';
const confirmOrderService = new ConfirmOrderService();


class PhonePeService {
  constructor() {
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
  async _createRefundRecord(data) {
    const refund = new RefundModel({
      ...data,
      attempts: 1,
      createdAt: new Date(),
    });
    return await refund.save();
  }

  async _updateRefundRecord(refundId, updateData) {
    return await RefundModel.findByIdAndUpdate(
      refundId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
  }

  async _processRefundWithRetry(refundRecord, transactionOrder, attempt = 1) {
    try {

      // Create Refund Payload
      const payload = {
        merchantId: this.merchantId,
        merchantUserId: transactionOrder.merchantUserId,
        merchantTransactionId: refundRecord.refundTransactionId,
        originalTransactionId: transactionOrder.orderId,
        amount: Math.round(refundRecord.amount * 100), // Convert to paisa
        callbackUrl: `${this.appUrl}/clientApis/v2/phonepe/refund-webhook`,
      };

      // Encode Payload to Base64
      const base64Body = Buffer.from(JSON.stringify(payload)).toString("base64");
      const refundEndPoint = "/pg/v1/refund"

      // Generate checksum for refund
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
      const checksum = this._calculateChecksum(base64Body , refundEndPoint);

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

      // Update refund record with PhonePe response
      await this._updateRefundRecord(refundRecord._id, {
        status: response.code === "PAYMENT_PENDING" ? "PROCESSING" : response.code === "PAYMENT_SUCCESS" ? "COMPLETED" : "FAILED",
        response: response?.data,
        lastAttempt: new Date(),
        attempts: attempt,
      });

      return response.data;

    } catch (error) {

      // Retry logic
      if (attempt < 3) {
        console.log(`Refund attempt ${attempt} failed, retrying...`);
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
        return this._processRefundWithRetry(refundRecord, transactionOrder, attempt + 1);
      }

      // Update refund record with failure after all retries
      await this._updateRefundRecord(refundRecord._id, {
        status: "FAILED",
        errorMessage: error.message || "INTERNAL SERVER ERROR",
        lastAttempt: new Date(),
        attempts: attempt,
      });

      return 
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
      return await confirmOrderService.confirmMultipleOrder(
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

  async initiateRefund(transactionOrderDetails, refundAmount) {
    try {

      // Generate unique refund transaction ID
      const refundTxnId = `REF_${transactionOrderDetails.orderId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create refund record with transaction
      const refundRecord = await this._createRefundRecord(
        {
            originalTransactionId: transactionOrderDetails.orderId,
            refundTransactionId: refundTxnId,
            amount: refundAmount,
            status: 'INITIATED',
            refundType: "FULL"
        },
    );

      // Initiate refund with retry mechanism
      const refundResult = await this._processRefundWithRetry(
        refundRecord,
        transactionOrderDetails
      );

      if(refundResult){
        // Example: Notify user of refund Initiated (implement notification logic)
        // await this._sendRefundCompletionNotification(refundRecord.userId);
      }

      return refundResult;

    } catch (error) {
      console.error("[PhonePe Refund Error]", error);
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