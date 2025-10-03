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
  email: { type: String, required: false, index: true },
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
  categoryOfEngagement: {
    type: String,
    enum: ["high", "medium", "low", "inactive"],
    default: "medium"
  },
  
  // Personal Information
  birthday: String, // Format: "MM/DD" (e.g., "03/15" for March 15th)
  married: { type: Boolean, default: false },
  spouseName: String,
  numberOfKids: { type: Number, default: 0 },
  
  // Story & Notes
  originStory: String, // How they came to F3/area
  notes: String, // General notes
  
  // Future fields (we'll refactor these)
  pipelines: [String], // Event pipelines they're in
  events: [String] // Events they've attended
}, { timestamps: true });

// Compound index for unique email per org
SupporterSchema.index({ orgId: 1, email: 1 }, { unique: true });

// Virtual for full name
SupporterSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.model("Supporter", SupporterSchema);

