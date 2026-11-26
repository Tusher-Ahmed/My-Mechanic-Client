import { Schema, model } from "mongoose";

const MessageSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
    },
    subject: { type: String, required: [true, "Subject is required"], trim: true, maxlength: 150 },
    message: { type: String, required: [true, "Message is required"], trim: true, maxlength: 3000 },
  },
  { timestamps: true, versionKey: false }
);

export const Message = model("Message", MessageSchema);
