import { Authorisation } from '../lib/authorisation/index.js';
import UnauthorisedError from '../lib/errors/unauthorised.error.js';

// const authorisation = (options) => (req, res, next) => {
//     const httpRequestMethod = req.method.toUpperCase();
//     const authorisation = new Authorisation(req.user, httpRequestMethod, options.resource,options.roles);

//     // If user is allowed to access given resource then moved to next function else forbid
//     authorisation.isAllowed().then(permission => {
//         req.permission = permission;
//         next();
//     }).catch(() => {
//         res.status(403).send();
//     });
// };


function authorisation(requiredRoles) {
    return (req, res, next) => {
        try {

            console.log("requiredRoles" , requiredRoles)
            console.log("role" , req.user.decodedToken.role)
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
