import mongoose from "mongoose";

const ContactListSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true,
    index: true 
  },
  
  // List Info
  name: { type: String, required: true },
  description: String,
  
  // List Type
  type: {
    type: String,
    enum: ["manual", "dynamic", "pipeline", "tag_based"],
    default: "manual"
  },
  
  // Manual Lists: Array of contact IDs
  supporterIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supporter"
  }],
  
  prospectIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "FamilyProspect"
  }],
  
  // Dynamic Lists: Filter criteria
  filters: {
    // Supporter filters
    supporterFilters: {
      categoryOfEngagement: [String], // ["high", "medium"]
      tags: [{
        name: String,
        value: String
      }],
      employer: String,
      city: String,
      yearsWithOrganization: {
        min: Number,
        max: Number
      }
    },
    
    // Prospect filters
    prospectFilters: {
      relationshipToMember: [String], // ["friend", "co_worker"]
      howDidYouMeet: [String], // ["work", "neighborhood"]
      eventInterest: [String], // ["high", "medium"]
      tags: [{
        name: String,
        value: String
      }]
    }
  },
  
  // Pipeline Lists: Event-specific
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event"
  },
  audienceType: String, // "org_member", "family_prospect"
  stages: [String], // ["member", "soft_commit", "paid"]
  
  // List Stats
  totalContacts: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  
  // Usage Tracking
  usageCount: { type: Number, default: 0 },
  lastUsed: Date,
  
  // Metadata
  createdBy: String,
  isActive: { type: Boolean, default: true },
  tags: [String] // For organization
}, { timestamps: true });

// Index for org + name uniqueness
ContactListSchema.index({ orgId: 1, name: 1 }, { unique: true });

// Method to get all contacts in this list
ContactListSchema.methods.getContacts = async function() {
  const contacts = [];
  
  // Get supporters
  if (this.supporterIds.length > 0) {
    const supporters = await this.constructor.db.model('Supporter').find({
      _id: { $in: this.supporterIds }
    });
    contacts.push(...supporters.map(s => ({ ...s.toObject(), type: 'supporter' })));
  }
  
  // Get prospects
  if (this.prospectIds.length > 0) {
    const prospects = await this.constructor.db.model('FamilyProspect').find({
      _id: { $in: this.prospectIds }
    });
    contacts.push(...prospects.map(p => ({ ...p.toObject(), type: 'prospect' })));
  }
  
  return contacts;
};

// Method to update dynamic list based on filters
ContactListSchema.methods.updateDynamicList = async function() {
  if (this.type !== 'dynamic') return;
  
  const contacts = [];
  
  // Apply supporter filters
  if (this.filters.supporterFilters) {
    const supporterQuery = { orgId: this.orgId };
    const sf = this.filters.supporterFilters;
    
    if (sf.categoryOfEngagement?.length) {
      supporterQuery.categoryOfEngagement = { $in: sf.categoryOfEngagement };
    }
    
    if (sf.tags?.length) {
      supporterQuery['tags.name'] = { $in: sf.tags.map(t => t.name) };
      supporterQuery['tags.value'] = { $in: sf.tags.map(t => t.value) };
    }
    
    if (sf.employer) supporterQuery.employer = sf.employer;
    if (sf.city) supporterQuery.city = sf.city;
    
    const supporters = await this.constructor.db.model('Supporter').find(supporterQuery);
    contacts.push(...supporters.map(s => ({ ...s.toObject(), type: 'supporter' })));
  }
  
  // Apply prospect filters
  if (this.filters.prospectFilters) {
    const prospectQuery = { orgId: this.orgId };
    const pf = this.filters.prospectFilters;
    
    if (pf.relationshipToMember?.length) {
      prospectQuery.relationshipToMember = { $in: pf.relationshipToMember };
    }
    
    if (pf.howDidYouMeet?.length) {
      prospectQuery.howDidYouMeet = { $in: pf.howDidYouMeet };
    }
    
    if (pf.eventInterest?.length) {
      prospectQuery.eventInterest = { $in: pf.eventInterest };
    }
    
    const prospects = await this.constructor.db.model('FamilyProspect').find(prospectQuery);
    contacts.push(...prospects.map(p => ({ ...p.toObject(), type: 'prospect' })));
  }
  
  this.totalContacts = contacts.length;
  this.lastUpdated = new Date();
  await this.save();
  
  return contacts;
};

export default mongoose.model("ContactList", ContactListSchema);
