import {Router} from 'express';
import { authentication } from '../middlewares/index.js';

import BillingController from './billings/billing.controller.js';
import DeliveryAddressController from './deliveryAddress/deliveryAddress.controller.js';
import MapController from "./map/map.controller.js";
import deliveryValidator from "./deliveryAddress/deliveryAddress.validator.js"
import billingValidator from "./billings/billing.validator.js"

const rootRouter = new Router();

const billingController = new BillingController();
const mapController = new MapController();
const deliveryAddressController = new DeliveryAddressController();

//#region billing details

rootRouter.post(
    '/v1/billing_details', 
    authentication(),
    billingValidator.billingAddress,
    billingController.billingAddress,
);

rootRouter.get('/v1/billing_details', authentication(), billingController.onBillingDetails);

rootRouter.put(
    '/v1/update_billing_details/:id', 
    authentication(),
    billingValidator.updateBillingAddress,
    billingController.updateBillingAddress,
);

//#endregion

//#region delivery address details

rootRouter.post(
    '/v1/delivery_address', 
    authentication(),
    deliveryValidator.deliveryAddress,
    deliveryAddressController.deliveryAddress,
);

rootRouter.get(
    '/v1/delivery_address', 
    authentication(), 
    deliveryAddressController.onDeliveryAddressDetails
);

rootRouter.put(
    '/v1/update_delivery_address/:id', 
    authentication(),
    deliveryValidator.updateDeliveryAddress,
    deliveryAddressController.updateDeliveryAddress,
);

rootRouter.delete(
    '/v1/delete_delivery_address/:id', 
    authentication(),
    deliveryValidator.deleteDeliveryAddress,
    deliveryAddressController.deleteDeliveryAddress,
);

rootRouter.get(
    '/v2/map/accesstoken',
    authentication(),
    mapController.mmiToken
);

//#endregion
export default rootRouter;
