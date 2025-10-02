import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true,
    index: true 
  },
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: String,
  tags: [String], // e.g. persona:sponsor, f3:ao-horsetrack
}, { timestamps: true });

// Compound index for unique email per org
ContactSchema.index({ orgId: 1, email: 1 }, { unique: true });

export default mongoose.model("Contact", ContactSchema);

