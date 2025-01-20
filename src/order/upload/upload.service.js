import BadRequestParameterError from '../../lib/errors/bad-request-parameter.error.js';
import getSignedUrlForUpload from '../../utils/s3Utils.js';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];

class UploadService {
    async upload(path, fileType) {
        try {
            console.log("path---->", path);
            console.log("path--filetype-->", fileType);

            if (!path) {
                throw new BadRequestParameterError("Missing order id");
            }

            if (!fileType) {
                throw new BadRequestParameterError("fileType is required");
            }

            if (!ALLOWED_EXTENSIONS.includes(fileType.toLowerCase())) {
                throw new BadRequestParameterError("Invalid file type");
            }

            return await getSignedUrlForUpload({ path, fileType });

        } catch (error) {

            if(error instanceof BadRequestParameterError) throw error
            // Log the error or handle it as needed
            console.error('Error in UploadService.upload:', error);
            // Re-throw the error if you want the calling function to handle it
            throw error;
        }
    }
}

export default UploadService;
