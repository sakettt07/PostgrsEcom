import { catchAsyncErrors } from "../middlewares/catchasync.middleware";
import database from "../database/db.js";
import ErrorHandler from "../middlewares/error.middleware.js";

const placeNewOrder = catchAsyncErrors(async (req, res, next) => {

});
const fetchSingleOrder = catchAsyncErrors(async (req, res, next) => {
    const { orderId } = req.params;
    const result = await database.query(
        `SELECT 
 o.*, 
 COALESCE(
 json_agg(
json_build_object(
'order_item_id', oi.id,
'order_id', oi.order_id,
'product_id', oi.product_id,
'quantity', oi.quantity,
'price', oi.price
 )
 ) FILTER (WHERE oi.id IS NOT NULL), '[]'
 ) AS order_items,
 json_build_object(
 'full_name', s.full_name,
 'state', s.state,
 'city', s.city,
 'country', s.country,
 'address', s.address,
 'pincode', s.pincode,
 'phone', s.phone
 ) AS shipping_info
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN shipping_info s ON o.id = s.order_id
WHERE o.id = $1
GROUP BY o.id, s.id;`, [orderId]
    )
    res.status(200).json({
        success: true,
        message: "Order fetched",
        orders: result.rows[0],
    })
})
const fetchMyOrders = catchAsyncErrors(async (req, res, next) => {
    const result = await database.query(
        `
        SELECT o.*, COALESCE(
 json_agg(
  json_build_object(
 'order_item_id', oi.id,
 'order_id', oi.order_id,
 'product_id', oi.product_id,
 'quantity', oi.quantity,
 'price', oi.price,
 'image', oi.image,
 'title', oi.title
  ) 
 ) FILTER (WHERE oi.id IS NOT NULL), '[]'
 ) AS order_items,
json_build_object(
 'full_name', s.full_name,
 'state', s.state,
 'city', s.city,
 'country', s.country,
 'address', s.address,
 'pincode', s.pincode,
 'phone', s.phone
 ) AS shipping_info 
 FROM orders o
 LEFT JOIN order_items oi ON o.id = oi.order_id
 LEFT JOIN shipping_info s ON o.id = s.order_id
WHERE o.buyer_id = $1 AND o.paid_at IS NOT NULL
GROUP BY o.id, s.id
        `,
        [req.user.id]
    );
    res.status(200).json({
        success: true,
        message: "All your orders fetched",
        myOrders: result.rows,
    });
});

export { placeNewOrder, fetchMyOrders, fetchSingleOrder };