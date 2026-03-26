import express from "express";
import { userSignup, userLogin, refreshAccessToken } from "../controllers/userController.js";
import { getAllProducts } from "../controllers/productController.js";
const router = express.Router();
import { getProductDetailById } from "../controllers/productController.js";
import { sendOtp, verifyOtp } from "../controllers/otpController.js";

router.post("/signup", userSignup);
router.post("/login", userLogin);
router.post("/refresh-token", refreshAccessToken);

router.post("/auth/send-otp", sendOtp);
router.post("/auth/verify-otp", verifyOtp);

router.get("/products", getAllProducts);
router.get("/product/:id", getProductDetailById);
export default router;
     