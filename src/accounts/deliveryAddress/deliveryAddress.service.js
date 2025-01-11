import { v4 as uuidv4 } from 'uuid';
import NoRecordFoundError from '../../lib/errors/no-record-found.error.js';
import DeliveryAddressMongooseModel from './db/deliveryAddress.js';
import BadRequestParameterError from '../../lib/errors/bad-request-parameter.error.js';
import mongoose from 'mongoose';

class DeliveryAddressService {

    /**
    * add delivery address
    * @param {Object} request
    * @param {Object} user
    */
    async deliveryAddress(request = {}, user = {}) {
        let session = null;
        try {

            // Start session
            session = await mongoose.startSession();
            session.startTransaction();

            // Construct the delivery address schema to be saved to the database
            const deliveryAddressSchema = {
                userId: user?.decodedToken?.uid, 
                id: uuidv4(), 
                descriptor: {
                    name: request?.descriptor?.name?.trim().replace(/\s+/g, ' '),
                    phone: request?.descriptor?.phone?.trim(),
                    email: request?.descriptor?.email?.trim().toLowerCase()
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
    
            // Perform operations within transaction and Mark all previous addresses for the user as non-default
            await DeliveryAddressMongooseModel.updateMany(
                { userId: user.decodedToken.uid },
                { defaultAddress: false },
                { session }  // Add session to the query
            );
    
            // Create the new delivery address and save it to the database
            let storedDeliveryAddress = await DeliveryAddressMongooseModel.create(
                [{ ...deliveryAddressSchema }],  // Wrap in array for transaction
                { session }  // Add session to create operation
            );

            // Get the created document (first element since create returns an array)
            storedDeliveryAddress = storedDeliveryAddress[0]?.toJSON();

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();
    
            return {
                id: storedDeliveryAddress?.id, 
                descriptor: {
                    name: storedDeliveryAddress?.descriptor?.name,
                    phone: storedDeliveryAddress?.descriptor?.phone,
                    email: storedDeliveryAddress?.descriptor?.email
                }, 
                gps: storedDeliveryAddress?.gps,
                defaultAddress: storedDeliveryAddress?.defaultAddress,
                address: {
                    areaCode: storedDeliveryAddress?.address?.areaCode,
                    door: storedDeliveryAddress?.address?.door,
                    building: storedDeliveryAddress?.address?.building,
                    street: storedDeliveryAddress?.address?.street,
                    city: storedDeliveryAddress?.address?.city,
                    state: storedDeliveryAddress?.address?.state,
                    lat: storedDeliveryAddress?.address?.lat, 
                    lng: storedDeliveryAddress?.address?.lng 
                },
            };
        } catch (err) {
            // Log error for debugging and rethrow
            if (session) {
                await session.abortTransaction();
                session.endSession();
            }
            console.error('Error in deliveryAddress:', err);
            throw new Error(`Failed to save delivery address: ${err.message}`);
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

            // Handle case when no addresses found
            if (!deliveryAddressDetails || deliveryAddressDetails.length === 0) {
                return [];
            }
            
            // Format the response
            return deliveryAddressDetails.map(address => ({
                id: address.id,
                descriptor: {
                    name: address.descriptor?.name,
                    phone: address.descriptor?.phone,
                    email: address.descriptor?.email
                },
                gps: address?.gps,
                defaultAddress: address?.defaultAddress,
                address: {
                    areaCode: address.address?.areaCode,
                    door: address.address?.door,
                    building: address.address?.building,
                    street: address.address?.street,
                    city: address.address?.city,
                    state: address.address?.state,
                    country: address.address?.country,
                    lat: address.address?.lat,
                    lng: address.address?.lng
                },
            }));
        }
        catch (err) {
            // Catch and rethrow the error, providing a clear message for the caller
            console.error('Error in onDeliveryAddressDetails:', err.message);
            throw new Error(`Failed to fetch delivery addresses: ${err.message}`);
        }
    }

    /**
    * add delivery address
    * @param {String} id
    * @param {Object} request
    * @param {String} userId
    */
    async updateDeliveryAddress(id, request = {}, userId) {
        let session = null;
        try {

            // Start transaction
            session = await mongoose.startSession();
            session.startTransaction();

            // Define the schema with the updated values
            const deliveryAddressSchema = {
                descriptor: {
                    name: request?.descriptor?.name?.trim().replace(/\s+/g, ' '),
                    phone: request?.descriptor?.phone.trim(),
                    email: request?.descriptor?.email?.trim().toLowerCase()
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
            const storedDeliveryAddress = await DeliveryAddressMongooseModel.findOne(
                { id, userId },
                { defaultAddress: 1 },
                { session }
            );
            
            if (!storedDeliveryAddress) {
                throw new NoRecordFoundError(`Delivery address with id ${id} not found`);
            }

            if(storedDeliveryAddress?.defaultAddress && (typeof(request?.defaultAddress) !== 'undefined' && request?.defaultAddress === false)) {
                throw new BadRequestParameterError('Default address cannot be unset. To change default address, please set another address as default first.');
            }
    
            // If `defaultAddress` is set to true, update all other addresses to `defaultAddress: false`
            if (request?.defaultAddress) {
                await DeliveryAddressMongooseModel.updateMany(
                    { 
                        userId,
                        id: { $ne: id } // Exclude current address
                    },
                    { defaultAddress: false },
                    { session }
                );
            }
    
            // Update the delivery address with new data
            storedDeliveryAddress = await DeliveryAddressMongooseModel.findOneAndUpdate(
                { id: id , userId: userId},
                { ...deliveryAddressSchema },
                {
                    returnDocument: "after",
                    session,
                    runValidators: true // Run schema validators
                }
            );
    
            // Convert the document to JSON for returning the result
            storedDeliveryAddress = storedDeliveryAddress?.toJSON();

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();
    
            return {
                id: storedDeliveryAddress?.id,
                descriptor: {
                    name: storedDeliveryAddress?.descriptor?.name,
                    phone: storedDeliveryAddress?.descriptor?.phone,
                    email: storedDeliveryAddress?.descriptor?.email
                },
                gps: storedDeliveryAddress?.gps,
                defaultAddress: storedDeliveryAddress?.defaultAddress,
                address: {
                    areaCode: storedDeliveryAddress?.address?.areaCode,
                    door: storedDeliveryAddress?.address?.door,
                    building: storedDeliveryAddress?.address?.building,
                    street: storedDeliveryAddress?.address?.street,
                    city: storedDeliveryAddress?.address?.city,
                    state: storedDeliveryAddress?.address?.state,
                    lat: storedDeliveryAddress?.address?.lat,
                    lng: storedDeliveryAddress?.address?.lng
                },
            };
        } catch (error) {
            // Abort transaction on error
            if (session) {
                await session.abortTransaction();
                session.endSession();
            }

            if(error instanceof BadRequestParameterError || error instanceof NoRecordFoundError ){
                throw error
            }
            console.error('Error in updateDeliveryAddress:', error);
            throw new Error(`Failed to update delivery address: ${error.message}`);
        }
    }

    /**
     * Delete a delivery address
     * @param {String} id - Address ID to delete
     * @param {String} userId - User ID of the owner
     */
    async deleteDeliveryAddress(id, request={}, userId) {
        let session = null;
        try {
            // Start transaction
            session = await mongoose.startSession();
            session.startTransaction();

            // Fetch the delivery address to be deleted
            const addressToDelete = await DeliveryAddressMongooseModel.findOne(
                { id, userId },
                { defaultAddress: 1 },  // Only fetch needed fields
                { session }
            );

            // If the address does not exist, throw an error
            if (!addressToDelete) {
                throw new NoRecordFoundError(`Delivery address with id ${id} not found`);
            }

            // Delete the address
            const deleteResult = await DeliveryAddressMongooseModel.deleteOne(
                { id, userId },
                { session }
            );

            if (deleteResult.deletedCount === 0) {
                throw new Error('The delivery address could not be deleted. Please try again.');
            }

            // If the deleted address was the default, set a new default address
            let remainingAddress = null;
            if (addressToDelete.defaultAddress) {
                remainingAddress = await DeliveryAddressMongooseModel.findOne(
                    { userId, id: { $ne: id } },
                    { id: 1 },
                    { session }
            );

            if (remainingAddress) {
                const updateResult = await DeliveryAddressMongooseModel.updateOne(
                    { id: remainingAddress.id },
                    { defaultAddress: true },
                    { session }
                );

                if (updateResult.modifiedCount === 0) {
                    throw new Error('The new default address could not be set');
                }
            }
        }

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            return {
                success: true,
                message: `Delivery address with id ${id} deleted successfully`,
                defaultAddressUpdated: addressToDelete.defaultAddress && remainingAddress ? true : false
            };
        } catch (error) {
            // Abort transaction on error
            if (session) {
                await session.abortTransaction();
                session.endSession();
            }

            if(error instanceof NoRecordFoundError) throw error
            console.error('Error in deleteDeliveryAddress:', error.message);
            throw error;
        }
    }


}

export default DeliveryAddressService;
