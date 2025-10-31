import express from "express";
import {
  register,
  login,
  profile,
  logout,
  updateProfile,
  forgotPassword,
  resetPassword,
  updatePassword,
  deleteUser,
  getAllUsers
} from "../controllers/user.controller.js";
import { authorizedRoles, isAuthenticated } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me",isAuthenticated,profile);
router.put("/me/update",isAuthenticated,updateProfile);
router.put("/password/update",isAuthenticated,updatePassword);
router.put("/password/reset/:token",resetPassword);
router.post("/password/forgot",forgotPassword)
router.get("/logout",isAuthenticated,logout);
// the below routes can only be accessed by the admin
router.delete("/delete/user",isAuthenticated,authorizedRoles("Admin"),deleteUser);
router.get("/users/all",isAuthenticated,authorizedRoles("Admin"),getAllUsers)
export default router;