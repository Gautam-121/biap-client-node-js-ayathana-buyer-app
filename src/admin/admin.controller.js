import {validationResult} from "express-validator"
import AdminService from './admin.service.js';
import BadRequestParameterError from "../lib/errors/bad-request-parameter.error.js";

const adminService = new AdminService();

class AdminController {

    login(req , res , next){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }

        const { body: request} = req
        adminService.login(request).then((response)=>{
            res.status(200).json(response)
        })
        .catch(err=>next(err))
    }

    fetchInterest(req , res , next){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }
        
        const { body: request , user , query } = req;
        adminService.getInterested(request , user , query).then((response)=>{
            res.status(200).json(response)
        })
        .catch(err=>next(err))
    }

    sendInvite(req , res , next){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new BadRequestParameterError(errors.array()[0].msg);
        }

        const { body: request , user , params } = req;
        adminService.sendInvite(request , user , params).then((response)=>{
            res.status(200).json(response)
        })
        .catch(err=>next(err))
    }

}

export default AdminController;

