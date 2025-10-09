import express from "express";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { createTables } from "./utils/createTable.utils.js";
import {errorMiddleware} from "./middlewares/error.middleware.js";
import userRouter from "./routes/user.routes.js";

const app=express();
config({path:"./config/config.env"});

app.use(
    cors({
        origin:[process.env.FRONTEND_URL,process.env.DASHBOARD_URL],
        methods:["GET","POST","PUT","DELETE"],
        credentials:true,
    })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(fileUpload({
    tempFileDir:"./uploads",
    useTempFiles:true
}));
// all the routes will come here
app.use("/api/v1/user", userRouter);
// app.use("/api/v1/product", productRouter);
// app.use("/api/v1/admin", adminRouter);
// app.use("/api/v1/order", orderRouter);

createTables();
app.use(errorMiddleware);


export default app;