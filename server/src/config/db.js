import mongoose from "mongoose";

export async function connectDB(url) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(url);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
