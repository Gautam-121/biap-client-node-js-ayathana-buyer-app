import {Router} from 'express';
import { authentication } from '../../../../middlewares/index.js';
import {validateAddItem , validateRemoveItem , validateClearCart , validateUpdateItemCart} from "./cart.validator.js"

import CartController from './cart.controller.js';

const rootRouter = new Router();

const cartController = new CartController();

rootRouter.post(
    '/v2/cart',
    authentication(),
    validateAddItem,
    cartController.addItem,
);

rootRouter.get(
    '/v2/cart',
    authentication(),
    cartController.getCartItem,
);

rootRouter.get(
    '/v2/shop/cart',
    authentication(),
    cartController.getAllCartItemMapToShop,
);

rootRouter.put(
    '/v2/cart/:itemId',
    authentication(),
    validateUpdateItemCart,
    cartController.updateItem,
);

rootRouter.delete(
    '/v2/cart/:itemId',
    authentication(),
    validateRemoveItem,
    cartController.removeItem,
);

rootRouter.delete(
    '/v2/cart/:id/clear',
    authentication(),
    validateClearCart,
    cartController.clearCart,
);

rootRouter.get(
    '/v2/cart/:userId/all',
    authentication(),
    cartController.getAllCartItem,
);

//#endregion
export default rootRouter;
