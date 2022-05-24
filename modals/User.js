const { Schema, model } = require("mongoose");

const UserSchema = Schema({
  username: {
    type: String,
    require: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    require: true,
    minlength: 10,
    maxlength: 200,
    unique: true,
  },
  phone: { type: Number, require: true },
  password: {
    type: String,
    require: true,
    minlength: 5,
    maxlength: 1024,
  },
});
module.exports = model("User", UserSchema);
