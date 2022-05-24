const { Schema, model } = require("mongoose");

const MechanicSchema = Schema({
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
  nid: { type: Number, require: true, minlength: 10, maxlength: 17 },
  password: {
    type: String,
    require: true,
    minlength: 5,
    maxlength: 1024,
  },
  shopname: {
    type: String,
    require: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  latitude: {
    type: Number,
    require: true,
  },
  longitude: {
    type: Number,
    require: true,
  },
  services: [{ serviceName: String, price: Number }],
  phone: { type: Number, require: true },
});
module.exports = model("Mechanic", MechanicSchema);
