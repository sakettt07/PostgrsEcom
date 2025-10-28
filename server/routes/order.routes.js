import express from "express";
import {placeNewOrder,fetchSingleOrder,fetchMyOrders} from "../controllers/order.controller.js"

import { isAuthenticated,authorizedRoles } from "../middlewares/auth.middleware";
const router=express.Router();
router.post("/new", isAuthenticated, placeNewOrder);
router.get("/:orderId", isAuthenticated, fetchSingleOrder);
router.get("/orders/me", isAuthenticated, fetchMyOrders);

export default router;