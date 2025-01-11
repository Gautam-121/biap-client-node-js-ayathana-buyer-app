import {Router} from 'express';
import { authentication, authorisation } from '../middlewares/index.js';

import AdminController from './admin.controller.js';
import adminValidator from './admin.validator.js';

const rootRouter = new Router();
const adminController = new AdminController();

rootRouter.post( 
    '/admin/register', 
    adminValidator.register,
    adminController.register,
);

rootRouter.post( // 
    '/admin/login', 
    adminValidator.login,
    adminController.login,
);

rootRouter.get( //
    '/admin/interests',
    authentication(),
    authorisation(["ADMIN"]),
    adminValidator.getInterest,
    adminController.fetchInterest,
);

rootRouter.post( //
    '/admin/interests/:id/invite',
    authentication(),
    adminValidator.sendInvite, 
    adminController.sendInvite
);




export default rootRouter;
