import mongoose from "mongoose";

const ContactEventMembershipSchema = new mongoose.Schema({
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
  contactId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Contact", 
    required: true,
    index: true 
  },
  stage: { type: String, default: "sop_entry" }, // sop_entry | rsvp | paid | attended | champion
  tags: [String], // event-scoped tags: source:landing, source:import, status:comp
  source: String, // landing_form | csv | qr | admin
  rsvp: { type: Boolean, default: false },
  paid: { type: Boolean, default: false },
  amount: { type: Number, default: 0 },
  champion: { type: Boolean, default: false }, // advocacy flag
  engagementScore: { type: Number, default: 0 } // future: bump on actions
}, { timestamps: true });

// Unique constraint: one membership per contact per event
ContactEventMembershipSchema.index(
  { orgId: 1, eventId: 1, contactId: 1 }, 
  { unique: true }
);

export default mongoose.model("ContactEventMembership", ContactEventMembershipSchema);

