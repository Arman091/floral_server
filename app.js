import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dbConnection from "./database/db.js";
import router from "./routes/route.js";

const app = express();
dotenv.config();

// More specific CORS configuration for development
app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests from your frontend
    credentials: true, // Allow cookies and authorization headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/", router);

dbConnection();
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is listening at http://localhost:${PORT}`);
});

// defaultData()
