import { body, param, query } from "express-validator";

const admin = {
    register: [
        body("name")
            .notEmpty()
            .withMessage("Name is required")
            .isString()
            .withMessage("Name must be a string")
            .trim()
            .escape()
            .isLength({ min: 2, max: 50 })
            .withMessage("Name must be between 2 and 50 characters long"),
        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Invalid email format")
            .normalizeEmail(),
        body("password")
            .notEmpty()
            .withMessage("Password is required")
            .isStrongPassword({
                minLength: 8,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 1,
                minSymbols: 1
            })
            .withMessage(
                "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character"
            ),
    ],
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
