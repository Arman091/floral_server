import userModel from "../model/userSchema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendNotification } from "../services/notificationService.js";

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

  const safeUser = user.toObject({ versionKey: false });
  delete safeUser.password;
  delete safeUser.refreshToken;
  safeUser.uid = safeUser._id;

  return { accessToken, refreshToken, user: safeUser };
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

    const missingFields = [];
    if (!firstName) missingFields.push("firstName");
    if (!lastName) missingFields.push("lastName");
    if (!userName) missingFields.push("userName");
    if (!email) missingFields.push("email");
    if (!password) missingFields.push("password");
    if (!formattedPhone) missingFields.push("formattedPhone");

    if (missingFields.length > 0) {
      return res.status(400).json({
        code: "BAD_REQUEST",
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        code: "BAD_REQUEST",
        message: "Password must be at least 6 characters.",
      });
    }

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

    const { accessToken, refreshToken, user: safeUser } = await handleSuccessfulAuth(
      res,
      newUser
    );

    if (safeUser.deviceToken) {
      sendNotification(
        safeUser.deviceToken,
        "Welcome to Floral Cart 🌸",
        `Hi ${safeUser.firstName}, thank you for signing up! We're glad to have you.`
      ).catch((err) => console.error("Failed to send welcome notification:", err));
    }

    return res.status(201).json({
      accessToken,
      refreshToken,
      user: safeUser,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
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

    const { accessToken, refreshToken, user: safeUser } = await handleSuccessfulAuth(res, user);

    return res.status(200).json({
      accessToken,
      refreshToken,
      user: safeUser,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken: oldToken } = req.body;

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

    if (!user) {
      return res.status(403).json({ code: "USER_NOT_FOUND", message: "User not found." });
    }

    if (user.refreshToken !== oldToken) {
      user.refreshToken = null;
      await user.save();

      return res.status(403).json({
        code: "TOKEN_REUSE_DETECTED",
        message: "Refresh token reuse detected. Please login again.",
      });
    }

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

    user.refreshToken = newRefreshToken;
    await user.save();

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(200).json({
        code: "LOGOUT_SUCCESS",
        message: "Logged out successfully.",
      });
    }

    const user = await userModel.findOne({ refreshToken: token });
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    return res.status(200).json({
      code: "LOGOUT_SUCCESS",
      message: "Logged out successfully.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    // This assumes an authentication middleware has run and attached the user's ID to req.user
    const userId = req.user?._id;
    console.log(req.body,"body");
    if (!userId) {
      return res.status(401).json({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    // Find user and exclude sensitive fields directly from the query
    const user = await userModel.findById(userId).select("-password -refreshToken -__v");

    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND", message: "User profile not found." });
    }

    return res.status(200).json({
      code: "PROFILE_FETCHED",
      message: "User profile fetched successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    // This assumes an authentication middleware has run and attached the user's ID to req.user
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ code: "UNAUTHORIZED", message: "Authentication required." });
    }

    const { firstName, lastName, userName, email, phone } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND", message: "User not found." });
    }

    // Build an object with only the fields that are being updated
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (userName) updates.userName = userName.toLowerCase();
    if (email) updates.email = email.toLowerCase();
    if (phone) updates.phone = phone;

    // Uniqueness validation for fields that must be unique
    if (updates.email && updates.email !== user.email && (await userModel.findOne({ email: updates.email }))) {
      return res.status(409).json({ code: "EMAIL_EXISTS", message: "Email is already in use." });
    }
    if (updates.userName && updates.userName !== user.userName && (await userModel.findOne({ userName: updates.userName }))) {
      return res.status(409).json({ code: "USERNAME_EXISTS", message: "Username is already in use." });
    }
    if (updates.phone && updates.phone !== user.phone && (await userModel.findOne({ phone: updates.phone }))) {
      return res.status(409).json({ code: "PHONE_EXISTS", message: "Phone number is already in use." });
    }

    // Apply updates and save the user
    Object.assign(user, updates);
    const updatedUser = await user.save();

    // Create a safe user object for the response
    const safeUser = updatedUser.toObject();
    delete safeUser.password;
    delete safeUser.refreshToken;
    delete safeUser.__v;

    return res.status(200).json({
      code: "PROFILE_UPDATED",
      message: "Profile updated successfully.",
      data: safeUser,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

