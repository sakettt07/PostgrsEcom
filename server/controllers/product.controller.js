import database from "../database/db.js";
import { v2 as cloudinary } from "cloudinary";
import { catchAsyncErrors } from "../middlewares/catchasync.middleware.js";
import ErrorHandler from "../middlewares/error.middleware.js";

const createProduct = catchAsyncErrors(async (req, res, next) => {
    const { name, description, price, stock, category } = req.body;
    const created_by = req.user.id;
    if (!name || !description || !price || !stock || !category) {
        return next(new ErrorHandler("Please provide complete product details", 400))
    }

    let uploadedImages = [];
    if (req.files && req.files.images) {
        const images = Array.isArray(req.files.images)
            ? req.files.images
            : [req.files.images];

        for (const image of images) {
            const result = await cloudinary.uploader.upload(image.tempFilePath, {
                folder: "Ecommerce_Product_Images",
                width: 1000,
                crop: "scale",
            });

            uploadedImages.push({
                url: result.secure_url,
                public_id: result.public_id,
            });
        }
    }

    const product = await database.query(
    `INSERT INTO products (name, description, price, category, stock, images, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      name,
      description,
      price / 283,
      category,
      stock,
      JSON.stringify(uploadedImages),
      created_by,
    ]
  )
  res.status(201).json({
    success:true,
    message:"Product created successfully",
    product:product.rows[0]
  })


});
const productDetails=catchAsyncErrors(async(req,res,next)=>{

})


export {createProduct,productDetails};