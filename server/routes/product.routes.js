import express from "express";
import { createProduct,deleteProduct,fetchAllProducts,productDetails, updateProduct,deleteReview } from "../controllers/product.controller.js";
import { isAuthenticated,authorizedRoles } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/create",isAuthenticated,authorizedRoles("Admin"),createProduct);
router.post("/admin/update/:productId",isAuthenticated,authorizedRoles("Admin"),updateProduct);
router.delete("/delete/:productId",isAuthenticated,authorizedRoles("Admin"),deleteProduct);
router.get("/",fetchAllProducts)
router.get("/:productId",productDetails)
router.delete("/delete/review/:productId", isAuthenticated, deleteReview);

export default router;