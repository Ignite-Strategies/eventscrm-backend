import mongoose from "mongoose";

const SupporterSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true,
    index: true 
  },
  
  // Contact Info (HubSpot-style)
  firstName: { type: String, required: true },
  goesBy: String, // Nickname/preferred name
  lastName: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: String,
  
  // Address
  street: String,
  city: String,
  state: String,
  zip: String,
  
  // Organization Context
  employer: String,
  yearsWithOrganization: Number,
  
  // Engagement Tracking (MVP1 - simplified)
  categoryOfEngagement: {
    type: String,
    enum: ["member", "donor", "volunteer", "sponsor", "partner", "general"],
    default: "general"
  },
  
  notes: String
}, { timestamps: true });

// Compound index for unique email per org
SupporterSchema.index({ orgId: 1, email: 1 }, { unique: true });

// Virtual for full name
SupporterSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.model("Supporter", SupporterSchema);

