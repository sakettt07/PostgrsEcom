import express from "express";
import {
  register,
  login,
  profile,
  logout,
  updateProfile,
  forgotPassword,
  resetPassword,
  updatePassword
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me",isAuthenticated,profile);
router.put("/me/update",isAuthenticated,updateProfile);
router.put("/password/update",isAuthenticated,updatePassword);
router.put("/password/reset/:token",resetPassword);
router.post("/password/forgot",forgotPassword)
router.get("/logout",isAuthenticated,logout);
export default router;