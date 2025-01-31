import { body, param } from "express-validator";

const rating = {
  rateRating: [
    body("*.rating_category")
      .exists()
      .withMessage("Rating category is required")
      .isIn(["order", "provider", "item", "fulfillment"])
      .withMessage("Invalid rating category"),
    body("*.id")
      .exists()
      .withMessage("ID is required")
      .isString()
      .withMessage("ID must be a string"),
    body("*.value")
      .exists()
      .withMessage("Rating value is required")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating value must be an integer between 1 and 5"),
  ],
};

export default rating
