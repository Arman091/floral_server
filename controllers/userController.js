import userModel from "../model/userSchema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendNotification } from "../services/notificationService.js";

/**
 * Handles successful authentication by generating tokens, setting cookies,
 * and returning a sanitized user object.
 * @param {object} res - The Express response object.
 * @param {object} user - The Mongoose user document.
 * @returns {Promise<{accessToken: string, user: object}>}
 */
export const handleSuccessfulAuth = async (res, user) => {
  const accessSecret = process.env?.JWT_ACCESS_SECRET;
  const refreshSecret = process.env?.JWT_REFRESH_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error("JWT secrets are not configured.");
  }

  const accessToken = jwt.sign(
    { _id: user._id, email: user.email, role: user.role },
    accessSecret,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign({ _id: user._id }, refreshSecret, {
    expiresIn: "7d",
  });

  user.refreshToken = refreshToken;
  await user.save();

  // Convert to a plain object to safely manipulate
  const safeUser = user.toObject({ versionKey: false });
  delete safeUser.password;
  delete safeUser.refreshToken;
  // Add uid to the response object, which is a copy of the database _id
  safeUser.uid = safeUser._id;

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { accessToken, user: safeUser };
};

export const userSignup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      userName,
      email,
      password,
      role,
      countryCode,
      countryCallingCode,
      formattedPhone,
      deviceToken,
    } = req.body ?? {};

    const existingEmail = await userModel
      .findOne({ email })
      .select("_id")
      .lean();
    if (existingEmail?._id) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const existingPhone = await userModel
      .findOne({ phone: formattedPhone })
      .select("_id")
      .lean();
    if (existingPhone?._id) {
      return res.status(409).json({ message: "Phone number already registered." });
    }

    const existingUsername = await userModel
      .findOne({ userName })
      .select("_id")
      .lean();
    if (existingUsername?._id) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({
      firstName,
      lastName,
      userName,
      email,
      password: hashedPassword,
      role,
      countryCode,
      countryCallingCode,
      phone: formattedPhone,
      deviceToken,
    });

    // Handle token generation and response
    const { accessToken, user: safeUser } = await handleSuccessfulAuth(
      res,
      newUser
    );

    // Send a welcome notification asynchronously
    if (safeUser.deviceToken) {
      sendNotification(
        safeUser.deviceToken,
        "Welcome to Floral Cart 🌸",
        `Hi ${safeUser.firstName}, thank you for signing up! We're glad to have you.`
      ).catch((err) => console.error("Failed to send welcome notification:", err));
    }

    return res.status(201).json({
      accessToken,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ code: "BAD_REQUEST", message: "Email and password are required." });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ code: "INVALID_CREDENTIALS", message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ code: "INVALID_CREDENTIALS", message: "Invalid credentials." });
    }

    // Handle token generation and response
    const { accessToken, user: safeUser } = await handleSuccessfulAuth(res, user);

    return res.status(200).json({
      accessToken,
      user: safeUser,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const oldToken = req.cookies?.refreshToken;

    if (!oldToken) {
      return res
        .status(401)
        .json({ code: "TOKEN_MISSING", message: "Refresh token not found." });
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const accessSecret = process.env.JWT_ACCESS_SECRET;

    if (!refreshSecret || !accessSecret) {
      return res
        .status(500)
        .json({ code: "SERVER_ERROR", message: "JWT secrets are not configured." });
    }

    let decoded;
    try {
      decoded = jwt.verify(oldToken, refreshSecret);
    } catch (err) {
      return res
        .status(403)
        .json({ code: "INVALID_REFRESH", message: "Invalid or expired refresh token." });
    }

    const user = await userModel.findById(decoded._id);

    // 🔴 TOKEN REUSE DETECTION
    if (!user) {
      return res.status(403).json({ code: "USER_NOT_FOUND", message: "User not found." });
    }

    if (user.refreshToken !== oldToken) {
      // Possible token theft / reuse attack
      user.refreshToken = null;
      await user.save();

      return res.status(403).json({
        code: "TOKEN_REUSE_DETECTED",
        message: "Refresh token reuse detected. Please login again.",
      });
    }

    // 🟢 GENERATE NEW TOKENS (ROTATION)
    const newAccessToken = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      accessSecret,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
      { _id: user._id },
      refreshSecret,
      { expiresIn: "7d" }
    );

    // 🟢 UPDATE DB
    user.refreshToken = newRefreshToken;
    await user.save();

    // 🟢 SET NEW COOKIE
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 🟢 SEND RESPONSE
    return res.status(200).json({
      accessToken: newAccessToken,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
