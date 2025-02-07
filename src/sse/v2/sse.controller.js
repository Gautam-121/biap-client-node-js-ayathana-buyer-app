import BadRequestParameterError from '../../lib/errors/bad-request-parameter.error.js';
import { addSSEConnection } from '../../utils/sse.js';

import SseProtocol from './sseProtocol.service.js';
import ConfigureSse from "./configureSse.service.js";

const sseProtocolService = new SseProtocol();

class SseController {

    /**
    * on event 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    async onEvent(req, res, next) {
        try {
            const { query = {} } = req;
            const { messageId } = query;

            console.log("[Headers] in event call" , req.headers)

            if (messageId && messageId.length) {
                const configureSse = new ConfigureSse(req, res, messageId);
                const initSSE = configureSse.initialize();
                console.log("Enter inside event trigger")
                addSSEConnection(messageId, initSSE);
            }
            // res.json({});
        }
        catch (err) {
            console.log("error----------->",err);
            throw err;
        }
    }

    /**
    * on cancel 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onCancel(req, res, next) {
        const { body: response } = req;

        sseProtocolService.onCancel(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on confirm 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onConfirm(req, res, next) {
        const { body: response } = req;

        sseProtocolService.onConfirm(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on init 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onInit(req, res, next) {
        const { body: response } = req;

        sseProtocolService.onInit(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on info 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */

    onInfo(req, res, next) {
        const { body: response } = req;

        sseProtocolService.onInfo(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }


    info(req, res, next) {
        const { body: response } = req;

        sseProtocolService.info(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on search 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onSearch(req, res, next) {
        const { body: response } = req;
        sseProtocolService.onSearch(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on quote 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onQuote(req, res, next) {
        const { body: response } = req;
    
        // Log when the request is received
        const startTime = Date.now();
        console.log(`[onQuote] Request received:`, response);
    
        // Process the quote
        sseProtocolService.onQuote(response).then(result => {
            // Log the time taken for processing the quote
            const processingTime = Date.now() - startTime;
            console.log(`[onQuote] Processing time: ${processingTime}ms`);
    
            // Log the final result
            console.log(`[onQuote] Final Result:`, result);
    
            // Send response back
            res.json(result);
        }).catch((err) => {
            // Log the error if there's an issue
            console.error(`[onQuote] Error occurred:`, err);
            next(err);
        });
    }

    /**
    * on status 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onStatus(req, res, next) {
        const { body: response } = req;
        sseProtocolService.onStatus(response).then(result => {
            console.log("Enter onStatus" , result)
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on support 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onSupport(req, res, next) {
        const { body: response } = req;

        sseProtocolService.onSupport(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on track 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onTrack(req, res, next) {
        const { body: response } = req;

        sseProtocolService.onTrack(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    onUpdate(req, res, next) {
        const { body: response } = req;

        console.log("Enter on_update" , response)

        sseProtocolService.onUpdate(response).then(result => {
            console.log("Enter response" , result)
            res.json(result);
        }).catch((err) => {
            console.log("Enter error" , err)
            next(err);
        });
    }

}

export default SseController;
