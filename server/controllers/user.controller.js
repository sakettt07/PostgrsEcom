import bcrypt, { hash } from "bcrypt";
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

const login =catchAsyncErrors(async(req,res,next)=>{
    const {email,password}=req.body;
    if(!email||!password){
        return next(new ErrorHandler("Please enter all fields",400));
    }
    const user=await database.query(`SELECT * FROM users WHERE email=$1`,[email]);
    if(user.rows.length===0){
        return next(new ErrorHandler("Invalid email or password",401));
    }
    const isPasswordMatch=await bcrypt.compare(password,user.rows[0].password);
    if(!isPasswordMatch){
        return next(new ErrorHandler("Invalid password",401));
    }
    sendToken(user.rows[0],200,"Logged in Successfully",res);
})
const logout =catchAsyncErrors(async(req,res,next)=>{
    res.status(200).cookie("token","",{
        expires:new Date(Date.now()),
        httpOnly:true,
    }).json({
        success:true,
        message:"Logged out successfully"
    });
});
const profile =catchAsyncErrors(async(req,res,next)=>{
    const {user}=req;
    res.status(200).json({
        success:true,
        user
    });
});
const updateProfile =catchAsyncErrors(async(req,res,next)=>{

})
const updatePassword =catchAsyncErrors(async(req,res,next)=>{
    const{currentPassword,newPassword,confirmNewPassword}=req.body;
    if(!currentPassword || !newPassword || !confirmNewPassword){
        return next(new ErrorHandler("Please enter all fields",400));
    }
    const isPasswordMatch=await bcrypt.compare(currentPassword,req.user.password);
    if(!isPasswordMatch){
        return next(new ErrorHandler("Current password is incorrect",401));
    }
    if(newPassword!=confirmNewPassword){
        return next(new ErrorHandler("New password and confirm new password do not match",400));
    }
    if(newPassword.length<8||newPassword.length>16||confirmNewPassword.length<8||confirmNewPassword.length>16){
        return next(new ErrorHandler("Password must be between 8 and 16 characters",400));
    }
    const hashedPassword=await bcrypt.hash(newPassword,10);
    await database.query(`UPDATE users SET password=$1 WHERE id=$2`,[hashedPassword,req.user.id]);
    res.status(200).json({
        success:true,
        message:"Password updated successfully"
    })
})
const forgotPassword =catchAsyncErrors(async(req,res,next)=>{

})
const resetPassword =catchAsyncErrors(async(req,res,next)=>{

})



export {register,login,logout,profile,updateProfile,updatePassword,forgotPassword,resetPassword};