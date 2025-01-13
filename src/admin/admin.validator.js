import { body, param, query } from "express-validator";

const admin = {
    login: [
        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Invalid email format")
            .normalizeEmail(),
        body("password")
            .notEmpty()
            .withMessage("Password is required"),
    ],
    getInterest: [
        query("status")
            .optional()
            .isIn(["pending", "invited", "registered"])
            .withMessage("Invalid status value. Allowed values are pending, invited, and registered."),
    
        query("page")
            .optional()
            .isInt({ min: 1 })
            .withMessage("Page must be a positive integer.")
            .toInt(), // Convert to integer for easier usage in your code
    
        query("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("Limit must be an integer between 1 and 100.")
            .toInt(), // Convert to integer for easier usage in your code
    ],
    sendInvite: [
        param("id")
            .notEmpty()
            .withMessage("ID is required")
            .isMongoId()
            .withMessage("Invalid ID format"),
    ],
};

export default admin;
