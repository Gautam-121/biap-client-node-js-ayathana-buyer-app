import { protocolTrack } from "../../utils/protocolApis/index.js";

class BppTrackService {
    
    /**
     * track order
     * @param {Object} context 
     * @param {Object} trackRequest 
     * @returns 
     */
    async track(context = {}, request = {}) {
        try {

            const trackRequest = {
                context: context,
                message: {
                    ...request.message
                }
            }
                        
            const response = await protocolTrack(trackRequest);
            
            return { context: context, message: response?.message , error: response?.error };
        }
        catch (err) {
            throw err;
        }
    }
}

export default BppTrackService;
