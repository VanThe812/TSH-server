import express from "express";
import db from "../db/conn.mjs";
import bcrypt, { hash } from "bcrypt";
import { ObjectId } from "mongodb";
import User from "../models/user.js";
import Role from "../models/role.js";
import Permission from "../models/permission.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Create user

// Register
router.post("/register", async (req, res) => {
  try {
    const { account, fullname, dateOfBirth, address, email, gender, password } =
      req.body;

    // Kiểm tra xem email hoặc account đã tồn tại chưa
    let existingUser = await User.findOne({
      $or: [{ email: email }, { account: account }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: 1, message: "Email or account is already in use." });
    }

    // Hash mật khẩu trước khi lưu vào cơ sở dữ liệu
    const hashedPassword = await bcrypt.hash(password, 10);

    const timecreate = Math.floor(Date.now() / 1000);
    await Permission.create({
      name_permission: "Use App",
      timecreate: timecreate,
    });

    const roleClient = await Role.findOne({ name_role: "client" });

    // Tạo người dùng mới
    const newUser = new User({
      fullname,
      dateOfBirth,
      address,
      email,
      gender,
      account: account.trim(),
      password: hashedPassword,
      timecreate,
      timemodifile: timecreate,
      role_id: roleClient._id,
    });

    await User.create(newUser);

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    const userJson = newUser.toJSON();
    delete userJson.password;
    res.json({ ...userJson, token });
  } catch (err) {
    console.error("Error registering user:", err);
    let errorMessage = "An error occurred while registering the user.";

    // Kiểm tra nếu lỗi là do validation, lấy thông tin chi tiết về lỗi validation
    if (err.errors) {
      errorMessage = Object.values(err.errors)
        .map((err) => err.message)
        .join(", ");
    }

    res.status(500).json({
      error: 1,
      message: errorMessage,
    });
  }
});

// Login

router.post("/login", async function (req, res) {
  try {
    const { account, password } = req.body;

    if (!account || !password) {
      return res
        .status(400)
        .json({ error: 1, message: "Account or Password is missing" });
    }
    const user = await User.findOne({ account });
    console.log(user);
    if (user) {
      bcrypt.compare(password, user.password, (err, result) => {
        console.log(err, result);
        if (result) {
          const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
          });
          const userJson = user.toJSON();
          delete userJson.password;
          res.json({ ...userJson, token });
        } else {
          res
            .status(400)
            .json({ error: 1, message: "Invalid Account/Password" });
        }
      });
    } else {
      return res
        .status(404)
        .json({ error: 1, message: "Your account or password is wrong" });
    }
  } catch (error) {}
});

export default router;
