import userModel from "../model/userSchema.js";
export const userSignup = async (req, res) => {
  try {
    const exist = await userModel.findOne({ userName: req.body.userName });
    if (exist) {
      return res.status(404).json({ message: "This userName already exist" });
    }

    const user = req.body;
    const newUser = new userModel(user);
    await newUser.save();

    res.status(200).json({ message: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const userLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    let user = await userModel.findOne({ email: email, password: password });
    if (user) {
      return res.status(200).json({ data: user });
    } else {
      return res.status(401).json("Invalid Login");
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
