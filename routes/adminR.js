const router = require("express").Router();
const Admin = require("../modals/Admin.js");
const User = require("../modals/User.js");
const Mechanic = require("../modals/mechanic.js");
const bcrypt = require("bcrypt");
//create new Admin
const createAdmin = async (req, res) => {
  try {
    let admin = await Admin.findOne({ email: req.body.email });
    if (admin) {
      res.status(400).json("Admin is already registered!");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(req.body.password, salt);
    const newAdmin = new Admin({
      username: req.body.username,
      email: req.body.email,
      password: hashedPass,
    });
    const result = await newAdmin.save();
    res.status(200).json(result);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};
//get all admin
const getAdmin = async (req, res) => {
  try {
    const admin = await Admin.find();
    res.status(200).json(admin);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};
//get all users
const getUser = async (req, res) => {
  try {
    const user = await User.find();
    res.status(200).json(user);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};

//get all mechanics
const getMechanic = async (req, res) => {
  try {
    const mechanic = await Mechanic.find();
    res.status(200).json(mechanic);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};
//admin login
const adminLogin = async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: req.body.email });
    if (!admin) {
      res.status(400).json("Invalid email or password!");
    }
    const validPassword = await bcrypt.compare(
      req.body.password,
      admin.password
    );
    if (!validPassword) {
      res.status(400).json("Invalid email or password!");
    }

    res.status(200).json({ _id: admin._id, email: admin.email });
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
    // console.log(err);
  }
};

router.route("/").post(createAdmin).get(getAdmin);
router.route("/users").get(getUser);
router.route("/mechanic").get(getMechanic);
router.route("/login").post(adminLogin);

module.exports = router;
