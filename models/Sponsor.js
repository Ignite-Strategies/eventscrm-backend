import mongoose from "mongoose";

const SponsorSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true,
    index: true 
  },
  companyName: { type: String, required: true },
  industry: String, // "restaurant", "fitness", "retail", etc.
  sponsorshipTier: {
    type: String,
    enum: ["title", "presenting", "platinum", "gold", "silver", "bronze", "in-kind"],
    required: true
  },
  primaryContact: {
    name: { type: String, required: true },
    title: String,
    email: { type: String, required: true },
    phone: String
  },
  billingContact: {
    name: String,
    email: String,
    phone: String
  },
  address: String,
  website: String,
  logo: String, // URL to logo file
  sponsorshipDetails: {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    amount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "invoiced", "paid", "partial", "overdue"],
      default: "pending"
    },
    paymentDate: Date,
    invoiceNumber: String,
    benefits: [String], // ["logo_on_website", "booth_space", "social_media_mention"]
    contractSigned: { type: Boolean, default: false },
    contractDate: Date
  },
  renewalLikelihood: {
    type: String,
    enum: ["high", "medium", "low", "unknown"],
    default: "unknown"
  },
  sponsorshipHistory: [{
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    year: Number,
    tier: String,
    amount: Number
  }],
  totalSponsored: { type: Number, default: 0 },
  tags: [String], // ["returning_sponsor", "local_business", "national_brand"]
  notes: String
}, { timestamps: true });

// Compound index
SponsorSchema.index({ orgId: 1, companyName: 1 });

export default mongoose.model("Sponsor", SponsorSchema);

