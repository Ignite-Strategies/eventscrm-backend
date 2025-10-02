import mongoose from "mongoose";

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mission: String,
  website: String,
  socials: {
    x: String,
    instagram: String,
    facebook: String,
    linkedin: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  pipelineDefaults: { 
    type: [String], 
    default: ["sop_entry", "rsvp", "paid", "attended", "champion"] 
  },
  audienceDefaults: { 
    type: [String], 
    default: [
      "org_members",
      "friends_family", 
      "community_partners",
      "local_businesses",
      "general_public"
    ] 
  },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" }],
}, { timestamps: true });

export default mongoose.model("Organization", OrganizationSchema);

