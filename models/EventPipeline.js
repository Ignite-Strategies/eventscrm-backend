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
  
  // Registry format: one record per stage per audience type
  audienceType: {
    type: String,
    enum: ["org_member", "friend_spouse", "community_partner", "business_sponsor", "champion"],
    default: "org_member"
  },
  
  stage: { 
    type: String, 
    enum: ["member", "soft_commit", "paid", "lost"],
    required: true
  },
  
  // Array of supporter IDs in this stage
  supporterIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supporter"
  }],
  
  // Tracking
  source: String, // "admin_add", "csv", "bulk_add", etc.
  
  // Optional metadata
  notes: String
}, { timestamps: true });

// Unique: one registry record per event + audience + stage combination
EventPipelineSchema.index({ orgId: 1, eventId: 1, audienceType: 1, stage: 1 }, { unique: true });

export default mongoose.model("EventPipeline", EventPipelineSchema);

