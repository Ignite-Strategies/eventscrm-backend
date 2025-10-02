import mongoose from "mongoose";

// FINAL BOSS - Created when someone completes funnel (paid/registered)
// Permanent record of event participation
const EventAttendeeSchema = new mongoose.Schema({
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
  
  audienceType: {
    type: String,
    enum: ["org_member", "friend_spouse", "community_partner", "business_sponsor", "champion"],
    required: true
  },
  
  ticketType: {
    type: String,
    enum: ["standard", "vip", "comp", "sponsor"],
    default: "standard"
  },
  
  // They made it through!
  registeredDate: { type: Date, default: Date.now },
  paid: { type: Boolean, required: true },
  amount: { type: Number, required: true },
  paymentDate: Date,
  paymentMethod: String, // "stripe", "comp", "cash"
  
  // Post-event
  attended: { type: Boolean, default: false },
  attendanceDate: Date,
  checkInTime: Date,
  
  // Final snapshot
  source: String, // Where they originally came from
  engagementScore: Number,
  tags: [String],
  
  // Event-specific
  dietaryRestrictions: String,
  plusOne: String,
  tableAssignment: String,
  notes: String
}, { timestamps: true });

// Unique: one final attendee record per email per event
EventAttendeeSchema.index({ orgId: 1, eventId: 1, email: 1 }, { unique: true });

export default mongoose.model("EventAttendee", EventAttendeeSchema);

