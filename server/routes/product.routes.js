import express from "express";
import { createProduct,deleteProduct,fetchAllProducts,productDetails, updateProduct,deleteReview,addReview, fetchAIFilteredProducts } from "../controllers/product.controller.js";
import { isAuthenticated,authorizedRoles } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/create",isAuthenticated,authorizedRoles("Admin"),createProduct);
router.delete("/delete/:productId",isAuthenticated,authorizedRoles("Admin"),deleteProduct);
router.get("/",fetchAllProducts);
router.post("/ai-search",isAuthenticated,fetchAIFilteredProducts)
router.get("/:productId",productDetails);
router.post("/add/review/:productId",isAuthenticated,addReview);
router.post("/admin/update/:productId",isAuthenticated,authorizedRoles("Admin"),updateProduct);
router.delete("/delete/review/:productId", isAuthenticated, deleteReview);

export default router;