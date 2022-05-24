const router = require("express").Router();
const Message = require("../modals/messageM.js");

const createMessage = async (req, res) => {
  try {
    const messages = new Message({
      email: req.body.email,
      subject: req.body.subject,
      message: req.body.message,
    });

    const result = await messages.save();
    res.status(200).json(result);
  } catch (err) {
    return res.status(400).json(err);
  }
};
//get Order
const getMessage = async (req, res) => {
  try {
    const messages = await Message.find();
    res.status(200).json(messages);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};
// Delete Order
const deleteMessage = async (req, res) => {
  const id = req.params.id;
  try {
    const messages = await Message.findByIdAndDelete(id);
    res.send(messages);
  } catch (err) {
    const errMsg = [];
    for (field in err.errors) {
      errMsg.push(err.errors[field].message);
    }
    return res.status(400).json(errMsg);
  }
};
router.route("/").post(createMessage).get(getMessage);
router.route("/:id").delete(deleteMessage);
module.exports = router;
