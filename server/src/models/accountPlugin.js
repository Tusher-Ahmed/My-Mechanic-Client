import bcrypt from "bcryptjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shared fields + password hashing for User, Mechanic and Admin. */
export function accountPlugin(schema) {
  schema.add({
    username: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [50, "Name must be at most 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [EMAIL_RE, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
  });

  schema.pre("save", async function hashPassword() {
    if (this.isModified("password")) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  });

  schema.methods.comparePassword = function comparePassword(plain) {
    return bcrypt.compare(plain, this.password);
  };

  schema.set("timestamps", true);
  schema.set("toJSON", {
    versionKey: false,
    transform: (_doc, ret) => {
      delete ret.password;
      return ret;
    },
  });
}

export const phoneField = {
  type: String,
  required: [true, "Phone number is required"],
  trim: true,
  match: [/^\+?[0-9\s-]{7,20}$/, "Please enter a valid phone number"],
};
