const { Schema, model } = require("mongoose");
const moment = require("moment-timezone");
const dateDhaka = moment.tz(Date.now(), "Asia/Dhaka");
//const dateDhaka = new Date();

const OrderSchema = Schema({
  mechanicUsername: {
    type: String,
    require: true,
    minlength: 3,
    maxlength: 30,
  },
  mechanicEmail: {
    type: String,
    require: true,
    minlength: 10,
    maxlength: 200,
  },
  mechanicId: {
    type: String,
    require: true,
  },
  date: { type: Date, default: dateDhaka },
  shopname: {
    type: String,
    require: true,
    minlength: 5,
    maxlength: 255,
  },
  services: [{}],
  totalPrice: {
    type: String,
    require: true,
  },
  userEmail: {
    type: String,
    require: true,
    minlength: 10,
    maxlength: 200,
  },
  userPhone: { type: Number, require: true },
  mechanicPhone: { type: Number, require: true },
  userId: { type: String, require: true },
  status: Boolean,
});
module.exports = model("Order", OrderSchema);
