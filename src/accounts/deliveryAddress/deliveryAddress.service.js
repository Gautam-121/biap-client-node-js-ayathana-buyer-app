import { v4 as uuidv4 } from 'uuid';
import NoRecordFoundError from '../../lib/errors/no-record-found.error.js';
import DeliveryAddressMongooseModel from './db/deliveryAddress.js';
import BadRequestParameterError from '../../lib/errors/bad-request-parameter.error.js';

class DeliveryAddressService {

    /**
    * add delivery address
    * @param {Object} request
    * @param {Object} user
    */
    async deliveryAddress(request = {}, user = {}) {
        try {

        // Construct the delivery address schema to be saved to the database
            const deliveryAddressSchema = {
                userId: user?.decodedToken?.uid, 
                id: uuidv4(), 
                descriptor: {
                    name: request?.descriptor?.name,
                    phone: request?.descriptor?.phone,
                    email: request?.descriptor?.email
                },
                gps: `${request?.lat},${request?.lng}`, 
                defaultAddress: true, 
                address: {
                    areaCode: request?.address?.areaCode,
                    door: request?.address?.door,
                    building: request?.address?.building,
                    street: request?.address?.street,
                    city: request?.address?.city,
                    state: request?.address?.state,
                    tag: request?.address?.tag,
                    country: request?.address?.country,
                    lat: request?.address?.lat  , 
                    lng: request?.address?.lng
                }, 
            };
    
        // Mark all previous addresses for the user as non-default
            await DeliveryAddressMongooseModel.updateMany(
                { userId: user.decodedToken.uid },
                { defaultAddress: false }, 
            )
    
        // Create the new delivery address and save it to the database
            let storedDeliveryAddress = await DeliveryAddressMongooseModel.create(
                { ...deliveryAddressSchema },
            )
    
        // Convert the stored document to JSON format for clean return
            storedDeliveryAddress = storedDeliveryAddress?.toJSON();
    
            return {
                id: storedDeliveryAddress?.id, 
                descriptor: storedDeliveryAddress?.descriptor, 
                gps: storedDeliveryAddress?.gps,
                defaultAddress: storedDeliveryAddress?.defaultAddress,
                address: storedDeliveryAddress?.address,
                lat: storedDeliveryAddress?.lat, 
                lng: storedDeliveryAddress?.lng 
            };
        } catch (err) {
            // Log error for debugging and rethrow
            console.error('Error in deliveryAddress:', err.message);
            throw err;
        }
    }

    /**
     * get delivery address
     * @param {Object} user
     */
    async onDeliveryAddressDetails(user = {}) {
        try {
            const deliveryAddressDetails = await DeliveryAddressMongooseModel.find({ 
                userId: user?.decodedToken?.uid
            })
            
            return deliveryAddressDetails;
        }
        catch (err) {
            // Catch and rethrow the error, providing a clear message for the caller
            console.error('Error in onDeliveryAddressDetails:', err.message);
            throw err;
        }
    }

    /**
    * add delivery address
    * @param {String} id
    * @param {Object} request
    * @param {String} userId
    */
    async updateDeliveryAddress(id, request = {}, userId) {
        try {

            // Define the schema with the updated values
            const deliveryAddressSchema = {
                descriptor: {
                    name: request?.descriptor?.name,
                    phone: request?.descriptor?.phone,
                    email: request?.descriptor?.email
                },
                gps: `${request?.lat},${request?.lng}`,
                defaultAddress: request?.defaultAddress,
                address: {
                    areaCode: request?.address?.areaCode,
                    door: request?.address?.door,
                    building: request?.address?.building,
                    street: request?.address?.street,
                    city: request?.address?.city,
                    state: request?.address?.state,
                    tag: request?.address?.tag,
                    country: request?.address?.country,
                    lat: request?.address?.lat,
                    lng: request?.address?.lng
                }
            };
    
            // Find the existing delivery address by its ID
            let storedDeliveryAddress = await DeliveryAddressMongooseModel.findOne({ id: id , userId: userId })
            
            if (!storedDeliveryAddress) {
                throw new NoRecordFoundError(`Delivery address with id ${id} not found`);
            }

            if(storedDeliveryAddress?.defaultAddress && (typeof(request?.defaultAddress) !== 'undefined' && request?.defaultAddress === false)) {
                throw new BadRequestParameterError('Default address cannot be unset. To change default address, please set another address as default first.');
            }
    
            // If `defaultAddress` is set to true, update all other addresses to `defaultAddress: false`
            if (request?.defaultAddress) {
                await DeliveryAddressMongooseModel.updateMany(
                    { userId: userId },
                    { defaultAddress: false },
                );
            }
    
            // Update the delivery address with new data
            storedDeliveryAddress = await DeliveryAddressMongooseModel.findOneAndUpdate(
                { id: id },
                { ...deliveryAddressSchema },
                {
                    returnDocument: "after",
                }
            );
    
            // Convert the document to JSON for returning the result
            storedDeliveryAddress = storedDeliveryAddress?.toJSON();
    
            return {
                id: storedDeliveryAddress?.id,
                descriptor: storedDeliveryAddress?.descriptor,
                gps: storedDeliveryAddress?.gps,
                defaultAddress: storedDeliveryAddress?.defaultAddress,
                address: storedDeliveryAddress?.address,
                lat: storedDeliveryAddress?.lat,
                lng: storedDeliveryAddress?.lng
            };
        } catch (err) {
            // Log the error for debugging purposes
            console.error('Error in updateDeliveryAddress:', err.message);
            // Throw the error back to the caller
            throw err;
        }
    }

    /**
     * Delete a delivery address
     * @param {String} id - Address ID to delete
     * @param {String} userId - User ID of the owner
     */
    async deleteDeliveryAddress(id, request={}, userId) {
        try {
            // Fetch the delivery address to be delete
            const addressToDelete = await DeliveryAddressMongooseModel.findOne({ id, userId });

            // If the address does not exist, throw an error
            if (!addressToDelete) {
                throw new NoRecordFoundError(`Delivery address with id ${id} not found`);
            }

            // Check if the address to be deleted is the default address
            const isDefaultAddress = addressToDelete.defaultAddress;

            // Delete the address
            await DeliveryAddressMongooseModel.deleteOne({ id, userId });

            // If the deleted address was the default, set a new default address
            if (isDefaultAddress) {
                const remainingAddresses = await DeliveryAddressMongooseModel.find({ userId });

                if (remainingAddresses.length > 0) {
                    // Set the first remaining address as the new default
                    await DeliveryAddressMongooseModel.updateOne(
                        { id: remainingAddresses[0].id },
                        { defaultAddress: true }
                    );
                }
            }

            return {
                success: true,
                message: `Delivery address with id ${id} deleted successfully`
            };
        } catch (err) {
            console.error('Error in deleteDeliveryAddress:', err.message);
            throw err;
        }
    }


}

export default DeliveryAddressService;
