import ConfirmOrderService from '../order/v2/confirm/confirmOrder.service.js';
import PhonePeService from '../phonePe/phonePe.service.js';

// Create and export service instances
export const initializeServices = () => {
    const phonePeService = new PhonePeService();
    const confirmOrderService = new ConfirmOrderService(phonePeService);
    return { phonePeService, confirmOrderService };
};
