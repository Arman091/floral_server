import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    min: 3,
    max: 20,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },

  userName: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true,
    lowercase: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    min: 6,
  },
  role: {
    type: String,
    enum: ["Admin", "regular"],
    default: "regular",
  },
  countryCode: {
    type: String,
    trim: true,
  },
  countryCallingCode: {
    type: String,
    trim: true,
  },
  deviceToken: {
    type: String,
    required:false,
  },
  refreshToken: {
    type: String,
  },
});

const userModel = mongoose.model("user", userSchema);

export default userModel;
