import mongoose from "mongoose";

const TemplateSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true,
    index: true 
  },
  
  // Template Info
  name: { type: String, required: true },
  description: String,
  
  // Template Content
  subject: { type: String, required: true },
  body: { type: String, required: true }, // HTML content
  
  // Template Type
  type: {
    type: String,
    enum: ["email", "sms", "invitation", "reminder", "follow_up"],
    default: "email"
  },
  
  // Usage Tracking
  usageCount: { type: Number, default: 0 },
  lastUsed: Date,
  
  // Template Variables (for dynamic content)
  variables: [{
    name: String, // e.g., "firstName", "eventName", "memberName"
    description: String, // e.g., "Contact's first name"
    required: { type: Boolean, default: false }
  }],
  
  // Status
  isActive: { type: Boolean, default: true },
  
  // Metadata
  createdBy: String, // Admin user who created it
  tags: [String] // For organization
}, { timestamps: true });

// Index for org + name uniqueness
TemplateSchema.index({ orgId: 1, name: 1 }, { unique: true });

export default mongoose.model("Template", TemplateSchema);
