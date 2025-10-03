import mongoose from "mongoose";

const FamilyProspectSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true,
    index: true 
  },
  
  // Basic Contact Info
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: false, index: true }, // Optional for prospects
  phone: String,
  
  // How do I know them?
  relationshipToMember: {
    type: String,
    enum: ["friend", "co_worker", "neighbor", "family_member", "spouse", "acquaintance", "other"],
    required: true
  },
  
  // Who brought them?
  memberWhoInvited: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Supporter",
    required: true 
  },
  memberName: String, // Cached name for easy display
  
  // How did we meet?
  howDidYouMeet: {
    type: String,
    enum: ["work", "neighborhood", "gym", "church", "school", "mutual_friend", "social_media", "event", "other"],
    required: true
  },
  
  // Event Interest
  eventInterest: {
    type: String,
    enum: ["high", "medium", "low"],
    default: "medium"
  },
  
  // Notes
  notes: String,
  
  // Tracking
  source: String, // "manual_add", "referral", etc.
  
  // Future fields
  events: [String] // Events they've attended
}, { timestamps: true });

// Compound index for unique email per org (only if email exists)
FamilyProspectSchema.index({ orgId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true, $ne: null } } });

// Virtual for full name
FamilyProspectSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.model("FamilyProspect", FamilyProspectSchema);
