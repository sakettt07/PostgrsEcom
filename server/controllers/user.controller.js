import bcrypt, { hash } from "bcrypt";
import database from "../database/db.js";
import { catchAsyncErrors } from "../middlewares/catchasync.middleware.js";
import ErrorHandler from "../middlewares/error.middleware.js";
import { sendToken } from "../utils/jwtToken.utils.js";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import { generateResetPasswordToken } from "../utils/generateResetPasswordToken.js";
import { generateEmailTemplate } from "../utils/generateEmailTemplate.js";
import { sendEmail } from "../utils/sendEmail.js";


const register = catchAsyncErrors(async (req, res, next) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return next(new ErrorHandler("Please enter all fields", 400));
    }
    if (password.length < 8 || password.length > 16) {
        return next(new ErrorHandler("Password must be between 8 and 16 characters", 400));
    }
    const isAlreadyRegistered = await database.query(
        `SELECT * FROM users WHERE email=$1`, [email]
    );
    if (isAlreadyRegistered.rows.length > 0) {
        return next(new ErrorHandler("User already registered", 400));
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await database.query(
        `INSERT INTO users (name,email,password) VALUES ($1,$2,$3) RETURNING *`,
        [name, email, hashedPassword]
    );
    // there is another way of writing this query is using sql injection
    sendToken(user.rows[0], 201, "Registered Successfully", res);
});

const login = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new ErrorHandler("Please enter all fields", 400));
    }
    const user = await database.query(`SELECT * FROM users WHERE email=$1`, [email]);
    if (user.rows.length === 0) {
        return next(new ErrorHandler("Invalid email or password", 401));
    }
    const isPasswordMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid password", 401));
    }
    sendToken(user.rows[0], 200, "Logged in Successfully", res);
})
const logout = catchAsyncErrors(async (req, res, next) => {
    res.status(200).cookie("token", "", {
        expires: new Date(Date.now()),
        httpOnly: true,
    }).json({
        success: true,
        message: "Logged out successfully"
    });
});
const profile = catchAsyncErrors(async (req, res, next) => {
    const { user } = req;
    res.status(200).json({
        success: true,
        user
    });
});
const updateProfile = catchAsyncErrors(async (req, res, next) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return next(new ErrorHandler("Please enter all fields", 400));
    }
    if (name.trim().length === 0 || email.trim().length === 0) {
        return next(new ErrorHandler("Fields cannot be empty", 400));
    }
    let avatarData = {};
    if (req.files && req.files.avatar) {
        const { avatar } = req.files;
        // remove the old avatar from cloudinary
        if (req.user?.avatar?.public_id) {
            await cloudinary.uploader.destroy(req.user.avatar.public_id);
        }
        // if not present then add
        const newProfileImage = await cloudinary.uploader.upload(
            avatar.tempFilePath, {
            folder: "Ecommerce_Avatars",
            width: 150,
            crop: "scale"
        }
        );
        avatarData = {
            public_id: newProfileImage.public_id,
            url: newProfileImage.secure_url
        }
    };
    let user;
    if (Object.keys(avatarData).length === 0) {
        user = await database.query(
            "UPDATE users SET name=$1,email=$2 WHERE id=$3 RETURNING *", [name, email, req.user.id]
        )
    }
    else {
        user = await database.query(
            "UPDATE users SET name=$1,email=$2,avatar=$3 WHERE id=$4 RETURNING *", [name, email, avatarData, req.user.id]
        )
    }
    res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: user.rows[0]
    });
});
const updatePassword = catchAsyncErrors(async (req, res, next) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return next(new ErrorHandler("Please enter all fields", 400));
    }
    const isPasswordMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isPasswordMatch) {
        return next(new ErrorHandler("Current password is incorrect", 401));
    }
    if (newPassword != confirmNewPassword) {
        return next(new ErrorHandler("New password and confirm new password do not match", 400));
    }
    if (newPassword.length < 8 || newPassword.length > 16 || confirmNewPassword.length < 8 || confirmNewPassword.length > 16) {
        return next(new ErrorHandler("Password must be between 8 and 16 characters", 400));
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await database.query(`UPDATE users SET password=$1 WHERE id=$2`, [hashedPassword, req.user.id]);
    res.status(200).json({
        success: true,
        message: "Password updated successfully"
    })
})
const forgotPassword = catchAsyncErrors(async (req, res, next) => {
    const { email } = req.body;
    const { frontendUrl } = req.query;
    if (!email) {
        return next(new ErrorHandler("Please enter your email", 400));
    }
    let userResult = await database.query(
        `SELECT * FROM users WHERE email=$1`, [email]
    )
    if (userResult.rows.length === 0) {
        return next(new ErrorHandler("No user found", 400));
    }
    const user = userResult.rows[0];
    const { hashedToken, resetPasswordExpireTime, resetToken } = generateResetPasswordToken();
    await database.query(
        `UPDATE users SET reset_password_token = $1, reset_password_expire = to_timestamp($2) WHERE email = $3`,
        [hashedToken, resetPasswordExpireTime / 1000, email]
    );
    const resetPasswordUrl = `${frontendUrl}/password/reset/${resetToken}`;
    const message = generateEmailTemplate(resetPasswordUrl);

    try {
        await sendEmail({
            email: user.email,
            subject: "Ecommerce Password Recovery",
            message,
        });
        res.status(200).json({
            success: true,
            message: `Email send to ${user.email} successfully`
        });
    } catch (error) {
        await database.query(
            `UPDATE users SET reset_password_token=NULL,reset_password_expire=NULL WHERE email=$1`, [email]
        );
        return next(new ErrorHandler("Email could not be send", 400));
    }

})
const resetPassword = catchAsyncErrors(async (req, res, next) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest("hex");
    const user = await database.query(
        `SELECT * FROM users WHERE reset_password_token=$1 AND reset_password_expire > NOW()`, [resetPasswordToken]
    );
    if (user.rows.length === 0) {
        return next(new ErrorHandler("Invalid or expired token", 400));
    }
    if (password !== confirmPassword) {
        return next(new ErrorHandler("Password does not match", 400));
    }
    if (password.length < 8 || password.length > 16 || confirmPassword.length < 8 || confirmPassword.length > 16) {
        return next(new ErrorHandler("Password must be between 8 and 16 characters", 400));
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await database.query(
        `UPDATE users SET password=$1,reset_password_token=NULL,reset_password_expire=NULL WHERE id=$2 RETURNING *`, [hashedPassword, user.rows[0].id]
    );
    sendToken(updatedUser.rows[0], 200, "Password reset successfully", res);

})

const getAllUsers=catchAsyncErrors(async(req,res,next)=>{
    const page=parseInt(req.query.page)||1;
    const totalUsersResult=await database.query(
        `SELECT COUNT(*) FROM users WHERE role =$1`,["User"]
    );
    const totalUsers=parseInt(totalUsersResult.rows[0].count);

    const offset=(page-1)*10;
    const users=await database.query(
        `SELECT * FROM users WHERE role=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,["User",10,offset]
    );
    res.status(200).json({
        success:true,
        totalUsers,
        currentPage:page,
        users:users.rows,
    });
});
export const deleteUser=catchAsyncErrors(async(req,res,next)=>{
    const {id}=req.params;
    const deleteUser=await database.query(
        `DELETE FROM users WHERE id=$1 RETURNING *`,[id]
    );

    if(deleteUser.rows.length===0){
        return next(new ErrorHandler("User not found",404));
    }
    const avatar=deleteUser.rows[0].avatar;
    if(avatar?.public_id){
        await cloudinary.uploader.destroy(avatar.public_id);
    }
    res.status(200).json({
        success:true,
        message:"User deleted successfully"
    });
});



export { register, login, logout, profile, updateProfile, updatePassword, forgotPassword, resetPassword,getAllUsers,deleteUser };