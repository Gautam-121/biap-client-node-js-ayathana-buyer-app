import CartService from './cart.service.js';
import {validationResult} from "express-validator"
import BadRequestParameterError from '../../../../lib/errors/bad-request-parameter.error.js';

const cartService = new CartService();

class CartController {

    async addItem(req, res, next) {
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new BadRequestParameterError(errors.array()[0].msg);
            }
           return res.send(await cartService.addItem({...req.body, userId: req.user.decodedToken.uid}));
        }
        catch (err) {
           next(err);
        }
    }

    async getCartItem(req, res, next) {
        try {
            return  res.send(await cartService.getCartItem({...req.body,userId: req.user.decodedToken.uid}));
        }
        catch (err) {
            next(err);
        }
    }

    async getAllCartItemMapToShop(req, res, next) {
        try {

            return  res.send(await cartService.getCartItemMapToShop({...req.body,userId: req.user.decodedToken.uid}));

        }
        catch (err) {
            next(err);
        }
    }


    async updateItem(req, res, next) {
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new BadRequestParameterError(errors.array()[0].msg);
            }

            return  res.send(await cartService.updateItem({...req.body, cartItemId: req?.params?.itemId, userId: req.user.decodedToken.uid }));
        }
        catch (err) {
            next(err);
        }
    }

    async removeItem(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new BadRequestParameterError(errors.array()[0].msg);
            }
            return res.send(await cartService.removeItem({...req.body,...req.params}));

        }
        catch (err) {
            next(err);
        }
    }

    async clearCart(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new BadRequestParameterError(errors.array()[0].msg);
            }
            return  res.send(await cartService.clearCart({...req.body,...req.params , userId: req.user.decodedToken.uid }));
        }
        catch (err) {
            next(err);
        }
    }

    async getAllCartItem(req, res, next) {
        try {
            return  res.send(await cartService.getAllCartItem({...req.body,...req.params}));
        }
        catch (err) {
            next(err);
        }
    }

}

export default CartController;