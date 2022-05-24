const { Schema, model } = require("mongoose");
const moment = require("moment-timezone");
const dateDhaka = moment.tz(Date.now(), "Asia/Dhaka");
//const dateDhaka = new Date();

const MessageSchema = Schema({
  email: {
    type: String,
    require: true,
    minlength: 10,
    maxlength: 200,
  },
  subject: {
    type: String,
    require: true,
  },
  date: { type: Date, default: dateDhaka },
  message: {
    type: String,
    require: true,
  },
});
module.exports = model("Message", MessageSchema);
