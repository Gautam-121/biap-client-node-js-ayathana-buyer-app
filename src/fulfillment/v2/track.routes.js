import {Router} from 'express';
import { authentication } from '../../middlewares/index.js';
import trackValidator from './track.validator.js';

import TrackController from './track.controller.js';

const router = new Router();
const trackController = new TrackController();

// track v1
router.post(
    '/v1/track', 
    trackController.track,
);
// track v2
router.post(
    '/v2/track', 
    authentication(),
    trackValidator.track,
    trackController.trackMultipleOrder,
);

// on track v1
router.get('/v1/on_track', trackController.onTrack);
// on track v2
router.get('/v2/on_track', authentication(),  trackValidator.on_track , trackController.onTrackMultipleOrder);

export default router;
