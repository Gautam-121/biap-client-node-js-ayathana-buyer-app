import { protocolRating, protocolSelect } from "../../../utils/protocolApis/index.js";
class BppRatingService {


    /**
    * bpp rate order
    * @param {Object} context 
    * @param {Object} order 
    * @returns 
    */
    async getRating(context, ratings= []) {
        try {

            const rateRequest = {
                context: context,
                message: {
                    ratings: ratings
                }
            };
            
            console.log("rating request",JSON.stringify(rateRequest))
            const response = await protocolRating(rateRequest);

            return { context: context, message: response.message , error: response?.error };
        }
        catch (err) {


            console.log(err);
            // err.response.data.rateRequest =order

            throw err;
        }
    }
}

export default BppRatingService;
