const router = require("express").Router();
const Order = require("../modals/orderM.js");

const createOrder = async (req, res) => {
  try {
    const order = new Order({
      mechanicUsername: req.body.mechanicUsername,
      mechanicEmail: req.body.mechanicEmail,
      mechanicId: req.body.mechanicId,
      shopname: req.body.shopname,
      services: req.body.services,
      totalPrice: req.body.totalPrice,
      userEmail: req.body.userEmail,
      userPhone: req.body.userPhone,
      mechanicPhone: req.body.mechanicPhone,
      userId: req.body.userId,
      status: req.body.status,
    });

    const result = await order.save();
    res.status(200).json(result);
  } catch (err) {
    return res.status(400).json(err);
  }
};
//get Order
const getOrder = async (req, res) => {
  try {
    const order = await Order.find();
    res.status(200).json(order);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};
// Delete Order
const deleteOrder = async (req, res) => {
  const id = req.params.id;
  try {
    const order = await Order.findByIdAndDelete(id);
    res.send(order);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};
//update User

const updateOrder = async (req, res) => {
  const id = req.body.id;
  const updatedData = {
    status: req.body.status,
  };
  try {
    const user = await Order.findByIdAndUpdate(id, updatedData, { new: true });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json(err);
  }
};
router.route("/").post(createOrder).get(getOrder).put(updateOrder);
router.route("/:id").delete(deleteOrder);
module.exports = router;
