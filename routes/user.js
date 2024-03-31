import express from "express";
import db from "../db/conn.mjs";
import bcrypt, { hash } from "bcrypt";
import { ObjectId } from "mongodb";
import User from "../models/user.js";
import Role from "../models/role.js";
import Permission from "../models/permission.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
const router = express.Router();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "vvthe8102002@gmail.com",
    pass: "vteojmidukbspmrd",
  },
  // host: "localhost",
  // port: 1025,
  // secure: false,
});

function generateRandomPassword() {
  const uppercaseLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercaseLetters = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";

  const allCharacters = uppercaseLetters + lowercaseLetters + numbers;

  let password = "";

  // Thêm một ký tự viết hoa ở đầu mật khẩu
  password += uppercaseLetters.charAt(
    Math.floor(Math.random() * uppercaseLetters.length)
  );

  // Thêm các ký tự ngẫu nhiên
  for (let i = 0; i < 7; i++) {
    password += allCharacters.charAt(
      Math.floor(Math.random() * allCharacters.length)
    );
  }

  return password;
}

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
      bcrypt.compare(password, user.password, async (err, result) => {
        console.log(err, result);
        if (result) {
          await user.updateOne({ timeaccess: Math.floor(Date.now() / 1000) });

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
  } catch (error) {
    let errorMessage = "An error occurred while registering the user.";
    console.log(error);
    res.status(500).json({
      error: 1,
      message: errorMessage,
    });
  }
});

// Forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Kiểm tra xem người dùng có tồn tại không
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 1, message: "User not found." });
    }

    const randomPassword = generateRandomPassword();
    // Cập nhật mật khẩu mới cho người dùng
    user.password = await bcrypt.hash(randomPassword, 10);
    user.status_account = "forgotpass";
    await user.save();
    // Tạo nội dung email
    const mailOptions = {
      from: "no-reply@tsh.io.vn",
      to: email,
      subject: "Reset Password to TSH",
      html: `This is your account: ${user.account} </br> New password: ${randomPassword}`,
    };

    // Gửi email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending forgot password email:", error);
        res.status(500).json({
          error: 1,
          message: "An error occurred while sending the email.",
        });
      } else {
        console.log("Email sent: " + info.response);
        res.status(200).json({
          error: 0,
          message: "Email sent successfully. Please check your inbox.",
        });
      }
    });
  } catch (error) {
    let errorMessage = "An error occurred.";
    res.status(500).json({
      error: 1,
      message: errorMessage,
    });
  }
});

// Change password
router.post("/change-password", async (req, res) => {
  try {
    const { token, oldPassword, newPassword } = req.body;

    //Xác thực
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 1, message: "User not found." });
    }

    bcrypt.compare(oldPassword, user.password, (req2, res2) => {
      if (!res2) {
        return res
          .status(403)
          .json({ error: 1, message: "Wrong current password." });
      } else {
        // Mã hóa mật khẩu mới
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        user.password = hashedPassword;
        user.save();
        const userJson = user.toJSON();
        delete userJson.password;
        res.json({ ...userJson });
      }
    });
  } catch (err) {
    console.log(err);
    let errorMessage = "An error occurred.";
    res.status(500).json({
      error: 1,
      message: errorMessage,
    });
  }
});

// Update indfo user
router.post("/update-info", async (req, res) => {
  try {
    const { fullname, dateOfBirth, address, email, gender, token } = req.body;

    //Xác thực
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 1, message: "User not found." });
    }

    user.fullname = fullname;
    user.dateOfBirth = dateOfBirth;
    user.address = address;
    user.email = email;
    user.gender = gender;

    await user.save();
    const userJson = user.toJSON();
    delete userJson.password;
    res.json({ ...userJson });
  } catch (error) {
    console.log(error);
    let errorMessage = "An error occurred.";
    if (error.errors) {
      errorMessage = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
    }
    if (error.message) {
      errorMessage = error.name + ": " + error.message;
    }
    res.status(500).json({
      error: 1,
      message: errorMessage,
    });
  }
});

// Admin
// Create user
// Update user
// Delete user
// User detail

export default router;
