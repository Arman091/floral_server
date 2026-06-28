import express from "express";
import {
  userSignup,
  userLogin,
  refreshAccessToken,
  logout,
  getProfile,
  updateProfile,
} from "../controllers/userController.js";
import { getAllProducts } from "../controllers/productController.js";
const router = express.Router();
import { getProductDetailById } from "../controllers/productController.js";
router.post("/signup", userSignup);
router.post("/login", userLogin);
router.post("/refresh-token", refreshAccessToken);
router.post("/auth/logout", logout);

// Note: The following profile routes should be protected by an auth middleware.
router.get("/user/profile", getProfile);
router.patch("/user/profile", updateProfile);

router.get("/products", getAllProducts);
router.get("/product/:id", getProductDetailById);
export default router;
     