import database from "../database/db.js";
import { v2 as cloudinary } from "cloudinary";
import { catchAsyncErrors } from "../middlewares/catchasync.middleware.js";
import ErrorHandler from "../middlewares/error.middleware.js";
import { getUSDToINRRate } from "../utils/currencyConverter.js";

const createProduct = catchAsyncErrors(async (req, res, next) => {
    const { name, description, price, stock, category } = req.body;
    const created_by = req.user.id;
    if (!name || !description || !price || !stock || !category) {
        return next(new ErrorHandler("Please provide complete product details", 400))
    }
    const USDToINRRate=await getUSDToINRRate();
    const priceInUSD=price/USDToINRRate;

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
      priceInUSD,
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
const fetchAllProduct=catchAsyncErrors(async(req,res,next)=>{
    const {availability,price,category,ratings,search}=req.query;
    const page=parseInt(req.query.page)||1;
    const limit=10;
    const offset=(page-1)*limit;

    const conditions=[];
    let values=[];
    let index=1;

    let paginationPlaceholders={};

    if(availability==="in-stock"){
        conditions.push(`stock >5`);
    }
    else if(availability==="limited"){
        conditions.push(`stock >5`);
    }
    else if(availability==="out-of-stock"){
        conditions.push(`stock=0`);
    }

    if(price){
        const [minPrice,maxPrice]=price.split("-");
        if(minPrice &&maxPrice){
            conditions.push(`price BETWEEN $${index} AND $${index+1}`);
            values.push(minPrice,maxPrice);
            index+=2;
        }
    }
    if(category){
        conditions.push(`category ILIKE$${index}`);
        values.push(`%${category}%`);
        index++;
    }
    if(ratings){
        conditions.push(`ratings >=$${index}`);
        values.push(ratings);
        index++;
    }
    if(search){
        conditions.push(`(p.name ILIKE $${index} OR p.description ILIKE $${index})`);
        values.push(`%${search}%`);
        index++;
    }
})
export {createProduct,productDetails,fetchAllProduct};