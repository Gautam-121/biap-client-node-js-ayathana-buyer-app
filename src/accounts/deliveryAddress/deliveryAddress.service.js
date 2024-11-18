import { v4 as uuidv4 } from 'uuid';
import NoRecordFoundError from '../../lib/errors/no-record-found.error.js';

import DeliveryAddressMongooseModel from './db/deliveryAddress.js';

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
                descriptor: request?.descriptor,
                gps: request?.gps, 
                defaultAddress: true, 
                address: request?.address, 
                lat: request?.lat, 
                lng: request?.lng
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
                descriptor: request?.descriptor,
                gps: request?.gps,
                defaultAddress: request?.defaultAddress,
                address: request?.address,
                lat: request?.lat,
                lng: request?.lng
            };
    
            // Find the existing delivery address by its ID
            let storedDeliveryAddress = await DeliveryAddressMongooseModel.findOne({ id: id , userId: userId })
            
            if (!storedDeliveryAddress) {
                throw new NoRecordFoundError(`Delivery address with id ${id} not found`);
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
