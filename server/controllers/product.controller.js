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
    const USDToINRRate = await getUSDToINRRate();
    const priceInUSD = price / USDToINRRate;

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
        success: true,
        message: "Product created successfully",
        product: product.rows[0]
    })


});
const productDetails = catchAsyncErrors(async (req, res, next) => {
    const { productId } = req.body;
    const product = await database.query("SELECT * FROM products WHERE id=$1", [productId]);
    if (product.rows.length === 0) {
        return next(new ErrorHandler("Product not found", 404));
    }
    const result = await database.query(
        `
            SELECT p.*,
        COALESCE(
        json_agg(
        json_build_object(
            'review_id', r.id,
            'rating', r.rating,
            'comment', r.comment,
            'reviewer', json_build_object(
            'id', u.id,
            'name', u.name,
            'avatar', u.avatar
            )) 
        ) FILTER (WHERE r.id IS NOT NULL), '[]') AS reviews
         FROM products p
         LEFT JOIN reviews r ON p.id = r.product_id
         LEFT JOIN users u ON r.user_id = u.id
         WHERE p.id  = $1
         GROUP BY p.id
        `, [productId]
    );
    res.status(200).json({
        success: true,
        message: "Product fetched successfully",
        product: result.rows[0],
    });
});
// in this we will be modifying the controller according the query params as we will be having the filters on the frontend
const fetchAllProducts = catchAsyncErrors(async (req, res, next) => {
    const { availability, price, category, ratings, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    let values = [];
    let index = 1;
    let paginationPlaceholders = {};

    // availability filter
    if (availability === "in-stock") {
        conditions.push(`stock > 5`);
    } else if (availability === "limited") {
        conditions.push(`stock > 0 AND stock <= 5`);
    } else if (availability === "out-of-stock") {
        conditions.push(`stock = 0`);
    }

    // price filter
    if (price) {
        const [minPrice, maxPrice] = price.split("-");
        const min = parseFloat(minPrice)
        const max = parseFloat(maxPrice)
        if (!isNaN(min) && !isNaN(max)) {
            conditions.push(`price BETWEEN $${index} AND $${index + 1}`);
            values.push(minPrice, maxPrice);
            index += 2;
        }
    }

    // category filter
    if (category) {
        conditions.push(`category ILIKE $${index}`);
        values.push(`%${category}%`);
        index++;
    }

    // ratings filter
    if (ratings) {
        conditions.push(`ratings >= $${index}`);
        values.push(ratings);
        index++;
    }

    // search filter
    if (search) {
        conditions.push(`(p.name ILIKE $${index} OR p.description ILIKE $${index})`);
        values.push(`%${search}%`);
        index++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // total count
    const totalProductsResult = await database.query(
        `SELECT COUNT(*) FROM products p ${whereClause}`,
        values
    );

    const totalProducts = parseInt(totalProductsResult.rows[0].count);

    paginationPlaceholders.limit = `$${index}`;
    values.push(limit);
    index++;

    paginationPlaceholders.offset = `$${index}`;
    values.push(offset);
    index++;

    const query = `
    SELECT p.*, COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r ON p.id = r.product_id
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ${paginationPlaceholders.limit}
    OFFSET ${paginationPlaceholders.offset};
  `;

    const result = await database.query(query, values);

    // new products
    const newProductsQuery = `
    SELECT p.*, COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r ON p.id = r.product_id
    WHERE p.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT 8;
  `;
    const newProductsResult = await database.query(newProductsQuery);

    // top rated
    const topRatedQuery = `
    SELECT p.*, COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r ON p.id = r.product_id
    WHERE p.ratings >= 4.5
    GROUP BY p.id
    ORDER BY p.ratings DESC, p.created_at DESC
    LIMIT 8;
  `;
    const topRatedResult = await database.query(topRatedQuery);

    res.status(200).json({
        success: true,
        products: result.rows,
        totalProducts,
        newProducts: newProductsResult.rows,
        topRatedProducts: topRatedResult.rows,
    });
});


const updateProduct = catchAsyncErrors(async (req, res, next) => {
    const { productId } = req.params;
    const { name, description, price, category, stock } = req.body;
    if (!name || !description || !price || !category || !stock) {
        return next(
            new ErrorHandler("Please provide complete product details")
        );
    }
    const product = await database.query("SELECT * FROM products WHERE id=$1", [productId]);
    if (product.rows.length === 0) {
        return next(new ErrorHandler("Product not found", 404));
    }
    const USDToINRRate = await getUSDToINRRate();
    const priceInUSD = price / USDToINRRate;
    const result = await database.query(
        `UPDATE products SET name=$1,description=$2,price=$3,category=$4,stock=$5 WHERE id=$6 RETURNING *`, [name, description, priceInUSD, category, stock, productId]
    );
    res.status(200).json({
        success: true,
        message: "Product updated successfully",
        updatedProduct: result.rows[0],
    });
})

const deleteProduct = catchAsyncErrors(async (req, res, next) => {
    const { productId } = req.params;
    const product = await database.query("SELECT * FROM products WHERE id=$1", [productId]);
    if (product.rows.length === 0) {
        return next(new ErrorHandler("Product not found", 404));
    }
    const images = product[0].images;
    const deleteResult = await database.query(
        "DELETE FROM products WHERE id=$1 RETURNING *", [productId]
    );
    if (deleteResult.rows.length === 0) {
        return next(new ErrorHandler("Failed to delete the product", 500));
    }
    if (images && images.length > 0) {
        for (const image of images) {
            await cloudinary.uploader.destroy(image.public_id);
        }
    }
    res.status(200).json({
        success: true,
        message: "Product deleted successfully"
    })

})

const deleteReview = catchAsyncErrors(async (req, res, next) => {
    const { productId } = req.params;
    const product = await database.query("SELECT * FROM products WHERE id=$1", [productId]);
    if (product.rows.length === 0) {
        return next(new ErrorHandler("Product not found", 404));
    }
    const review = await database.query("DELETE FROM reviews WHERE product_id = $1 AND user_id = $2 RETURNING *",
        [productId, req.user.id])
    if (review.rows.length === 0) {
        return next(new ErrorHandler("Review not found.", 404));
    }

    const allReviews = await database.query(
        `SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = $1`,
        [productId]
    );

    const newAvgRating = allReviews.rows[0].avg_rating;

    const updatedProduct = await database.query(
        `
        UPDATE products SET ratings = $1 WHERE id = $2 RETURNING *
        `,
        [newAvgRating, productId]
    );

    res.status(200).json({
        success: true,
        message: "Your review has been deleted.",
        review: review.rows[0],
        product: updatedProduct.rows[0],
    });
})
export { createProduct, productDetails, fetchAllProducts, updateProduct, deleteProduct, deleteReview };