import express from "express";

import { isAuthenticated,authorizedRoles } from "../middlewares/auth.middleware";
const router=express.Router();