import pkg from "pg";
import { config } from "dotenv";

config({ path: "./config/config.env" });
const {Client}=pkg;

const database=new Client({
    user:process.env.DB_USER,
    host:process.env.DB_HOST,
    database:process.env.DB_NAME,
    password:process.env.DB_PASSWORD,
    port:process.env.DB_PORT,
});

try {
    await database.connect();
    console.log("Connected to the Postgres DB---)")
} catch (error) {
    console.log("Error occured while connecting with DB--: ",error);
    process.exit(1);
}

export default database;