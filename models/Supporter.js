import mongoose from "mongoose";

const SupporterSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true,
    index: true 
  },
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: String,
  type: {
    type: String,
    enum: ["individual", "family", "corporate", "foundation"],
    default: "individual"
  },
  donationHistory: [{
    amount: Number,
    date: Date,
    campaign: String
  }],
  totalDonated: { type: Number, default: 0 },
  tags: [String], // ["monthly_donor", "major_donor", "legacy"]
  interests: [String], // ["youth_programs", "community_events"]
  communicationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    mail: { type: Boolean, default: false }
  },
  notes: String
}, { timestamps: true });

// Compound index for unique email per org
SupporterSchema.index({ orgId: 1, email: 1 }, { unique: true });

export default mongoose.model("Supporter", SupporterSchema);

