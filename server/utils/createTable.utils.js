import {createUserTable} from '../models/user.model.js';
import {createProductTable} from '../models/product.model.js';
import {createOrdersTable} from '../models/order.model.js';
import {createReviewsTable} from '../models/reviews.model.js';
import {createShippingInfoTable} from '../models/shippingInfo.model.js';
import {createPaymentsTable} from '../models/payment.model.js';
import {createOrderItemTable} from '../models/orderItem.model.js'
export const createTables=async()=>{
    try {
        await createUserTable();
        await createProductTable();
        await createReviewsTable();
        await createOrdersTable();
        await createOrderItemTable();
        await createShippingInfoTable();
        await createPaymentsTable();
        console.log("All Tables Created Successfully");
    } catch (error) {
        console.log("Error while creating tables: ",error);
    }
}