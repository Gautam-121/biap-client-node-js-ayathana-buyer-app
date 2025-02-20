import UserMongooseModel from "../user/db/user.js"

// Add new method to check if phone verification is needed
const checkPhoneVerificationStatus = async (userId) => {
    try {
        const user = await UserMongooseModel.findById(userId);
        if (!user) {
            throw new NoRecordFoundError('User not found');
        }

        // Check if phone verification is needed
        const needsPhoneVerification = !user.phone || user.isPhoneVerified === false;
        
        if (needsPhoneVerification) {
            return {
                requiresPhoneVerification: true,
                message: 'Phone verification required before proceeding with transaction'
            };
        }

        return {
            requiresPhoneVerification: false,
            message: 'Phone is verified'
        };
    } catch (error) {
        throw error;
    }
}

export default checkPhoneVerificationStatus;

