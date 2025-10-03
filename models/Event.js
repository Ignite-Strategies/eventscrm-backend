import mongoose from "mongoose";

const EventSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true,
    index: true 
  },
  name: { type: String, required: true },
  slug: { type: String, required: true, index: true },
  description: String,
  date: Date,
  time: String, // e.g., "7:00 PM"
  location: String,
  hasTickets: { type: Boolean, default: false },
  ticketCost: { type: Number, default: 0 },
  pipelines: [String], // optional override of org defaults
  pipelineRules: {
    autoSopOnIntake: { type: Boolean, default: true },
    sopTriggers: { 
      type: [String], 
      default: ["landing_form", "csv", "qr", "admin_add"] 
    },
    rsvpTriggers: { 
      type: [String], 
      default: ["form_rsvp", "button_click"] 
    },
    paidTriggers: { 
      type: [String], 
      default: ["stripe_webhook"] 
    },
    championCriteria: {
      minEngagement: { type: Number, default: 3 },
      tagsAny: { 
        type: [String], 
        default: ["role:ao_q", "role:influencer", "shared_media"] 
      },
      manualOverrideAllowed: { type: Boolean, default: true }
    }
  },
  goals: {
    totalFundraise: { type: Number, default: 0 },
    ticketTarget: { type: Number, default: 0 },
    costs: { type: Number, default: 0 }
  },
  audienceSegmentation: {
    members: {
      conversionRate: { type: Number, default: 0.25 }, // 25%
      targetCount: { type: Number, default: 0 }
    },
    friends: {
      conversionRate: { type: Number, default: 0.15 }, // 15%
      targetCount: { type: Number, default: 0 }
    },
    ads: {
      conversionRate: { type: Number, default: 0.05 }, // 5%
      targetCount: { type: Number, default: 0 }
    },
    totalOutreachTarget: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Compound index for unique slug per org
EventSchema.index({ orgId: 1, slug: 1 }, { unique: true });

export default mongoose.model("Event", EventSchema);

