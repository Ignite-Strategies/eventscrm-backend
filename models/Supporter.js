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
  
  // Engagement Tracking
  eventsAttended: { type: Number, default: 0 },
  categoryOfEngagement: {
    type: String,
    enum: ["member", "donor", "volunteer", "sponsor", "partner", "general"],
    default: "general"
  },
  
  // Pipeline (current stage in org relationship)
  pipeline: {
    type: String,
    enum: ["prospect", "active", "champion", "inactive"],
    default: "prospect"
  },
  
  // Legacy fields
  donationHistory: [{
    amount: Number,
    date: Date,
    campaign: String
  }],
  totalDonated: { type: Number, default: 0 },
  tags: [String],
  
  // Preferences
  communicationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    mail: { type: Boolean, default: false }
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

