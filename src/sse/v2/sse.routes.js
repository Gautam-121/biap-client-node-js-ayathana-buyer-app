import { Router } from 'express';
import authentication from '../../middlewares/authentication.js';

import SseController from './sse.controller.js';

const sseController = new SseController();
const rootRouter = new Router();

// rootRouter.get('/events/v2', authentication(), sseController.onEvent);
rootRouter.get('/events/v2', sseController.onEvent);

rootRouter.post('/response/v2/on_cancel', sseController.onCancel);//done
rootRouter.post('/response/v2/on_confirm', sseController.onConfirm)
rootRouter.post('/response/v2/on_init', sseController.onInit);// done
rootRouter.post('/response/v2/on_info', sseController.onInfo);//done
rootRouter.post('/response/v2/info', sseController.info);//done
rootRouter.post('/response/v2/on_search', sseController.onSearch);//done
rootRouter.post('/response/v2/on_select', sseController.onQuote); // done
rootRouter.post('/response/v2/on_status', sseController.onStatus);//done
rootRouter.post('/response/v2/on_support', sseController.onSupport); // done
rootRouter.post('/response/v2/on_track', sseController.onTrack); // done
rootRouter.post('/response/v2/on_update', sseController.onUpdate)// done

export default rootRouter;
