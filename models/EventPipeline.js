import mongoose from "mongoose";

const EventPipelineSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true,
    index: true 
  },
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Event", 
    required: true,
    index: true 
  },
  supporterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Supporter",
    required: true,
    index: true 
  },
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: String,
  
  // Which pipeline (audience type)
  audienceType: {
    type: String,
    enum: ["org_member", "friend_spouse", "community_partner", "business_sponsor", "champion"],
    default: "org_member"
  },
  
  // Where in journey
  stage: { 
    type: String, 
    enum: ["member", "soft_commit", "paid"],
    default: "member" 
  },
  
  // Tracking
  source: String, // landing_form | csv | qr | admin | tag_filter
  rsvp: { type: Boolean, default: false },
  rsvpDate: Date,
  paid: { type: Boolean, default: false },
  paymentDate: Date,
  amount: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0 },
  tags: [String], // ["source:csv", "rule:auto_soft_commit@2025-10-02"]
  
  // Optional fields
  dietaryRestrictions: String,
  plusOne: String,
  notes: String
}, { timestamps: true });

// Unique: one pipeline record per email per event
EventPipelineSchema.index({ orgId: 1, eventId: 1, email: 1 }, { unique: true });

export default mongoose.model("EventPipeline", EventPipelineSchema);

