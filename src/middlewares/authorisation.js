import UnauthorisedError from '../lib/errors/unauthorised.error.js';

function authorisation(requiredRoles) {
    return (req, res, next) => {
        try {
            // Check if the user has any of the required roles
            if (!requiredRoles.some(role => role === req.user.decodedToken.role)) {
                throw new UnauthorisedError('You do not have permission to access this resource');
            }
            next();
        } catch (error) {
            console.error('Authorization error:', error.message);
            throw new UnauthorisedError("Access denied")
        }
    };
}

export default authorisation;
