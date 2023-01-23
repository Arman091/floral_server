import express from "express";
import { userSignup, userLogin } from "../controllers/userController.js";
import { getAllProducts } from "../controllers/productController.js";
const router = express.Router();
import { getProductDetailById } from "../controllers/productController.js";
router.post("/signup", userSignup);
router.post("/login", userLogin);
router.get("/products", getAllProducts);
router.get("/product/:id", getProductDetailById);

export default router;
     