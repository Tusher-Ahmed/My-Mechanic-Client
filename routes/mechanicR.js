const router = require("express").Router();
const Mechanic = require("../modals/mechanic.js");
const bcrypt = require("bcrypt");

//create Mechanic

const createMechanic = async (req, res) => {
  try {
    let mechanic = await Mechanic.findOne({ email: req.body.email });
    if (mechanic) {
      return res.status(400).json("Mechanic is already registered !!");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(req.body.password, salt);
    const newMechanic = new Mechanic({
      username: req.body.username,
      phone: req.body.phone,
      email: req.body.email,
      nid: req.body.nid,
      password: hashedPass,
      shopname: req.body.shopname,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      services: req.body.services,
      activity: req.body.services,
    });

    const result = await newMechanic.save();
    res.status(200).json(result);
  } catch (err) {
    return res.status(400).json(err);
  }
};

//mechanic login
const mechanicLogin = async (req, res) => {
  try {
    const mechanic = await Mechanic.findOne({ email: req.body.email });
    if (!mechanic) {
      res.status(400).json("Invalid email or password!");
    }
    const validPassword = await bcrypt.compare(
      req.body.password,
      mechanic.password
    );
    if (!validPassword) {
      res.status(400).json("Invalid email or password!");
    }

    res.status(200).json({ _id: mechanic._id, email: mechanic.email });
  } catch (err) {
    res.status(500).json(err);
  }
};

//getMechanic
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

//update mechanic
const updateMechanic = async (req, res) => {
  const id = req.body.id;
  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash(req.body.password, salt);
  const updatedData = {
    username: req.body.username,
    phone: req.body.phone,
    password: hashedPass,
    shopname: req.body.shopname,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    services: req.body.services,
    phone: req.body.phone,
  };
  try {
    const mechanic = await Mechanic.findByIdAndUpdate(id, updatedData, {
      new: true,
    });
    res.status(200).json(mechanic);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};
// Delete Mechanic
const deleteMechanic = async (req, res) => {
  const id = req.params.id;
  try {
    const mechanic = await Mechanic.findByIdAndDelete(id);
    res.send(mechanic);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};

router.route("/").post(createMechanic).get(getMechanic).put(updateMechanic);
router.route("/:id").delete(deleteMechanic);
router.route("/login").post(mechanicLogin);

module.exports = router;
