import express from "express";
import { createProduct,productDetails } from "../controllers/product.controller.js";
import { isAuthenticated,authorizedRoles } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/create",isAuthenticated,authorizedRoles("Admin"),createProduct);

export default router;