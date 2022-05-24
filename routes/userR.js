const router = require("express").Router();
const User = require("../modals/User.js");
const bcrypt = require("bcrypt");
//create user

const createUser = async (req, res) => {
  try {
    let user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.status(400).send("User is already registered !!");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(req.body.password, salt);
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPass,
    });

    const result = await newUser.save();
    res.status(200).json(result);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).send(errMsg);
  }
};
//getUser
const getUser = async (req, res) => {
  try {
    const user = await User.find().sort(req.body.date);
    res.status(200).json(user);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};

//login

const userLogin = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      res.status(400).json("Invalid email or password!");
    }
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      res.status(400).json("Invalid email or password!");
    }

    res.status(200).json({ _id: user._id, email: user.email });
  } catch (err) {
    res.status(500).json(err);
  }
};
//update User

const updateUser = async (req, res) => {
  const id = req.body.id;
  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash(req.body.password, salt);
  const updatedData = {
    username: req.body.username,
    password: hashedPass,
  };
  try {
    const user = await User.findByIdAndUpdate(id, updatedData, { new: true });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json(err);
  }
};
// Delete User
const deleteUser = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await User.findByIdAndDelete(id);
    res.send(user);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};

router.route("/").post(createUser).put(updateUser).get(getUser);
router.route("/:id").delete(deleteUser);
router.route("/login").post(userLogin);

module.exports = router;
