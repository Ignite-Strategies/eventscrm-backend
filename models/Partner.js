import mongoose from "mongoose";

const PartnerSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true,
    index: true 
  },
  organizationName: { type: String, required: true },
  partnershipType: {
    type: String,
    enum: ["community", "nonprofit", "government", "educational", "corporate"],
    default: "community"
  },
  primaryContact: {
    name: String,
    title: String,
    email: String,
    phone: String
  },
  secondaryContact: {
    name: String,
    email: String,
    phone: String
  },
  address: String,
  website: String,
  socialMedia: {
    facebook: String,
    instagram: String,
    linkedin: String,
    twitter: String
  },
  partnershipLevel: {
    type: String,
    enum: ["platinum", "gold", "silver", "bronze", "collaborator"],
    default: "collaborator"
  },
  contributions: [String], // ["venue", "marketing", "volunteers", "funding"]
  eventsParticipated: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Event" 
  }],
  startDate: Date,
  renewalDate: Date,
  status: {
    type: String,
    enum: ["active", "inactive", "prospective", "former"],
    default: "active"
  },
  tags: [String], // ["venue_provider", "media_partner", "volunteer_source"]
  notes: String
}, { timestamps: true });

// Index for organization name search
PartnerSchema.index({ orgId: 1, organizationName: 1 });

export default mongoose.model("Partner", PartnerSchema);

