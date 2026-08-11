const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { registrationValidation, loginUserValidation } = require("../validation/loginValidation");
const generateAcessToken = require("../utils/generateAcessToken");
const Admin = require("../models/Admin");

const registerUser = async (req, res) => {
  try {
    const { error, value } = registrationValidation(req.body);
    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    const { name, email, password, role } = value;

    const admin = await Admin.findOne({ email });
    if (admin) {
      return res.status(400).json({
        message: "email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({
      name,
      email,
      password: hashPassword,
      role,
    });
    const savedData = await newAdmin.save();
    savedData.password = undefined;

    return res.status(201).json({
      message: "user created SucessFully",
      data: savedData,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "internal server error",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { error, value } = loginUserValidation(req.body);
    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    const { email, password } = value;

    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return res.status(400).json({
        message: "Invalide credential",
      });
    }
    const comparePassword = await bcrypt.compare(password, admin.password);
    if (!comparePassword) {
      return res.status(400).json({
        message: "invalide credential",
      });
    }

    const accessToken = generateAcessToken(admin._id);

    const cookiesOption = {
      httpOnly: true,
      secure: true,
    };
    res.cookie("accessToken", accessToken, cookiesOption);

    return res.json({
      message: "login Sucessfully",
      data: accessToken,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "error in login",
    });
  }
};
module.exports = { registerUser, loginUser };
