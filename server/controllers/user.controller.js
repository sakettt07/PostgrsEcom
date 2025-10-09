import bcrypt from "bcrypt";
import database from "../database/db.js";
import {catchAsyncErrors} from "../middlewares/catchasync.middleware.js";
import ErrorHandler from "../middlewares/error.middleware.js";
import { sendToken } from "../utils/jwtToken.utils.js";



const register=catchAsyncErrors(async(req,res,next)=>{
    const {name,email,password}=req.body;
    if(!name || !email || !password){
        return next(new ErrorHandler("Please enter all fields",400));
    }
    const isAlreadyRegistered=await database.query(
        `SELECT * FROM users WHERE email=$1`,[email]
    );
    if(isAlreadyRegistered.rows.length>0){
        return next(new ErrorHandler("User already registered",400));
    }
    const hashedPassword= await bcrypt.hash(password,10);
    const user=await database.query(
        `INSERT INTO users (name,email,password) VALUES ($1,$2,$3) RETURNING *`,
        [name,email,hashedPassword]
    );
    // there is another way of writing this query is using sql injection
    sendToken(user.rows[0],201,"Registered Successfully",res);
});



export {register};