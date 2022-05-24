const express = require("express");
const mongoose = require("mongoose");
const userRouter = require("./routes/userR");
const mechanicRouter = require("./routes/mechanicR.js");
const adminRouter = require("./routes/adminR.js");
const orderRouter = require("./routes/orderR.js");
const messageRouter = require("./routes/messageR.js");
const dotenv = require("dotenv");
const cors = require("cors");
const app = express();
dotenv.config();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT;

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Succesfully Connect to MongoDB"))
  .catch((err) => console.log(err));

app.listen(PORT, () => {
  console.log(`Server listen on port ${PORT}`);
});
app.get("/", (req, res) => {
  res.send("Hi there");
});
app.use("/api/user", userRouter);
app.use("/api/mechanic", mechanicRouter);
app.use("/api/admin", adminRouter);
app.use("/api/order", orderRouter);
app.use("/api/message", messageRouter);
