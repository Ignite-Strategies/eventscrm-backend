import mongoose from "mongoose";

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // TODO: Hash with bcrypt in production
  email: String,
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  role: { 
    type: String, 
    enum: ["admin", "manager", "viewer"],
    default: "admin"
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("AdminUser", AdminUserSchema);

