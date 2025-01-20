// Order Service for handling multi-seller orders in ONDC
const axios = require('axios');

class ONDCOrderService {
  constructor() {
    this.ondcGateway = process.env.ONDC_GATEWAY_URL;
    this.buyerAppId = process.env.BUYER_APP_ID;
  }

  async createMultiSellerOrder(cartItems) {
    try {
      // 1. Group items by seller
      const itemsBySeller = this.groupItemsBySeller(cartItems);
      
      // 2. Create individual orders for each seller
      const orderPromises = Object.entries(itemsBySeller).map(
        async ([sellerId, items]) => {
          return this.createSellerOrder(sellerId, items);
        }
      );

      // 3. Wait for all orders to be created
      const orders = await Promise.all(orderPromises);
      
      // 4. Create master order to track all sub-orders
      const masterOrder = await this.createMasterOrder(orders);
      
      return masterOrder;
    } catch (error) {
      throw new Error(`Failed to create multi-seller order: ${error.message}`);
    }
  }

  groupItemsBySeller(cartItems) {
    return cartItems.reduce((acc, item) => {
      if (!acc[item.sellerId]) {
        acc[item.sellerId] = [];
      }
      acc[item.sellerId].push(item);
      return acc;
    }, {});
  }

  async createSellerOrder(sellerId, items) {
    // 1. Initialize ONDC order context
    const orderContext = this.createOrderContext(sellerId);
    
    // 2. Create order init payload
    const initPayload = {
      context: orderContext,
      message: {
        order: {
          provider: { id: sellerId },
          items: items.map(item => ({
            id: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }
      }
    };

    // 3. Send init request to ONDC network
    const initResponse = await axios.post(
      `${this.ondcGateway}/init`,
      initPayload
    );

    // 4. Confirm order after initialization
    const confirmPayload = this.createConfirmPayload(
      initResponse.data.context,
      items
    );
    
    const confirmedOrder = await axios.post(
      `${this.ondcGateway}/confirm`,
      confirmPayload
    );

    return {
      orderId: confirmedOrder.data.message.order.id,
      sellerId,
      items,
      status: 'CONFIRMED'
    };
  }

  createOrderContext(sellerId) {
    return {
      domain: 'retail',
      country: 'IND',
      city: 'std:080',
      action: 'init',
      core_version: '1.1.0',
      bap_id: this.buyerAppId,
      bap_uri: 'https://buyerapp.com',
      bpp_id: sellerId,
      timestamp: new Date().toISOString(),
      message_id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      transaction_id: `${Date.now()}-${Math.random().toString(36).substring(7)}`
    };
  }

  createConfirmPayload(context, items) {
    return {
      context: {
        ...context,
        action: 'confirm'
      },
      message: {
        order: {
          items: items.map(item => ({
            id: item.productId,
            quantity: item.quantity,
            price: item.price
          })),
          billing: {
            // Add billing details
          },
          fulfillment: {
            // Add fulfillment details
          }
        }
      }
    };
  }

  async createMasterOrder(subOrders) {
    // Create a master order in your database to track all sub-orders
    const masterOrder = {
      masterOrderId: `MASTER-${Date.now()}`,
      subOrders: subOrders,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      totalAmount: subOrders.reduce((total, order) => {
        return total + order.items.reduce((sum, item) => {
          return sum + (item.price * item.quantity);
        }, 0);
      }, 0)
    };

    // Save master order to your database
    // await db.masterOrders.create(masterOrder);

    return masterOrder;
  }
}

module.exports = ONDCOrderService;