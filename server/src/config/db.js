import mongoose from "mongoose";

export async function connectDB(url) {
  mongoose.set("strictQuery", true);
  // strip query operators ($ne, $gt, $where…) that sneak into filters – defence in depth against NoSQL injection
  mongoose.set("sanitizeFilter", true);
  await mongoose.connect(url);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
