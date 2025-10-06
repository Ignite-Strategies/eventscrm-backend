import { getPrismaClient } from "../config/database.js";

const prisma = getPrismaClient();

class ContactListService {
  
  /**
   * Create a new contact list with proper validation and setup
   */
  static async createContactList(listData) {
    const { orgId, name, type, criteria } = listData;
    
    // Validate required fields
    if (!orgId || !name || !type) {
      throw new Error("orgId, name, and type are required");
    }
    
    // Check for duplicate names
    const existingList = await ContactList.findOne({ orgId, name });
    if (existingList) {
      throw new Error("Contact list name already exists for this organization");
    }
    
    // Build list data based on type
    const contactListData = await this.buildListData(listData);
    
    // Create the list
    const contactList = new ContactList(contactListData);
    await contactList.save();
    
    // Calculate initial contact count
    await this.updateContactCount(contactList);
    
    return contactList;
  }
  
  /**
   * Get all contacts for a specific list (THE MAIN MAGIC!)
   */
  static async getContactsForList(listId) {
    const contactList = await ContactList.findById(listId);
    if (!contactList) {
      throw new Error("Contact list not found");
    }
    
    let contacts = [];
    
    switch (contactList.type) {
      case "manual":
        contacts = await this.getManualContacts(contactList);
        break;
        
      case "pipeline":
        contacts = await this.getPipelineContacts(contactList);
        break;
        
      case "tag_based":
        contacts = await this.getTagBasedContacts(contactList);
        break;
        
      case "dynamic":
        contacts = await this.getDynamicContacts(contactList);
        break;
        
      default:
        throw new Error(`Unknown list type: ${contactList.type}`);
    }
    
    // Update usage tracking
    await this.trackUsage(contactList);
    
    return contacts;
  }
  
  /**
   * Get contacts from manual list (supporterIds + prospectIds)
   */
  static async getManualContacts(contactList) {
    const contacts = [];
    
    // Get supporters
    if (contactList.supporterIds?.length > 0) {
      const supporters = await Supporter.find({
        _id: { $in: contactList.supporterIds }
      });
      contacts.push(...supporters.map(s => ({ 
        ...s.toObject(), 
        type: 'supporter',
        source: 'manual'
      })));
    }
    
    // Get prospects
    if (contactList.prospectIds?.length > 0) {
      const prospects = await FamilyProspect.find({
        _id: { $in: contactList.prospectIds }
      });
      contacts.push(...prospects.map(p => ({ 
        ...p.toObject(), 
        type: 'prospect',
        source: 'manual'
      })));
    }
    
    return contacts;
  }
  
  /**
   * Get contacts from pipeline registry (THE REGISTRY MAGIC!)
   */
  static async getPipelineContacts(contactList) {
    const { eventId, audienceType, stages } = contactList;
    
    if (!eventId || !audienceType || !stages?.length) {
      throw new Error("Pipeline lists require eventId, audienceType, and stages");
    }
    
    // Get all pipeline registry entries for this event/audience/stages
    const pipelineEntries = await EventPipeline.find({
      eventId,
      audienceType,
      stage: { $in: stages }
    });
    
    const contacts = [];
    const allContactIds = new Set(); // Prevent duplicates
    
    // Collect all unique contact IDs from pipeline entries
    for (const entry of pipelineEntries) {
      entry.supporterIds.forEach(id => allContactIds.add(id));
    }
    
    // Fetch contacts based on audience type
    if (audienceType === "org_member") {
      const supporters = await Supporter.find({
        _id: { $in: Array.from(allContactIds) }
      });
      contacts.push(...supporters.map(s => ({ 
        ...s.toObject(), 
        type: 'supporter',
        source: 'pipeline',
        pipelineStage: this.getContactStage(s._id, pipelineEntries)
      })));
    } else if (audienceType === "family_prospect") {
      const prospects = await FamilyProspect.find({
        _id: { $in: Array.from(allContactIds) }
      });
      contacts.push(...prospects.map(p => ({ 
        ...p.toObject(), 
        type: 'prospect',
        source: 'pipeline',
        pipelineStage: this.getContactStage(p._id, pipelineEntries)
      })));
    }
    
    return contacts;
  }
  
  /**
   * Get contacts based on tag criteria
   */
  static async getTagBasedContacts(contactList) {
    const { filters } = contactList;
    const contacts = [];
    
    // Process supporter tags
    if (filters?.supporterFilters?.tags?.length > 0) {
      const supporterQuery = { orgId: contactList.orgId };
      
      // Build complex tag query
      const tagConditions = filters.supporterFilters.tags.map(tag => ({
        [`tags.${tag.name}`]: tag.value
      }));
      
      if (tagConditions.length === 1) {
        Object.assign(supporterQuery, tagConditions[0]);
      } else {
        supporterQuery.$and = tagConditions;
      }
      
      const supporters = await Supporter.find(supporterQuery);
      contacts.push(...supporters.map(s => ({ 
        ...s.toObject(), 
        type: 'supporter',
        source: 'tag_based'
      })));
    }
    
    // Process prospect tags
    if (filters?.prospectFilters?.tags?.length > 0) {
      const prospectQuery = { orgId: contactList.orgId };
      
      const tagConditions = filters.prospectFilters.tags.map(tag => ({
        [`tags.${tag.name}`]: tag.value
      }));
      
      if (tagConditions.length === 1) {
        Object.assign(prospectQuery, tagConditions[0]);
      } else {
        prospectQuery.$and = tagConditions;
      }
      
      const prospects = await FamilyProspect.find(prospectQuery);
      contacts.push(...prospects.map(p => ({ 
        ...p.toObject(), 
        type: 'prospect',
        source: 'tag_based'
      })));
    }
    
    return contacts;
  }
  
  /**
   * Get contacts from dynamic list with complex filters
   */
  static async getDynamicContacts(contactList) {
    const { filters } = contactList;
    const contacts = [];
    
    // Process supporter filters
    if (filters?.supporterFilters) {
      const supporterQuery = this.buildSupporterQuery(contactList.orgId, filters.supporterFilters);
      const supporters = await Supporter.find(supporterQuery);
      contacts.push(...supporters.map(s => ({ 
        ...s.toObject(), 
        type: 'supporter',
        source: 'dynamic'
      })));
    }
    
    // Process prospect filters
    if (filters?.prospectFilters) {
      const prospectQuery = this.buildProspectQuery(contactList.orgId, filters.prospectFilters);
      const prospects = await FamilyProspect.find(prospectQuery);
      contacts.push(...prospects.map(p => ({ 
        ...p.toObject(), 
        type: 'prospect',
        source: 'dynamic'
      })));
    }
    
    return contacts;
  }
  
  /**
   * Build complex supporter query from filters
   */
  static buildSupporterQuery(orgId, filters) {
    const query = { orgId };
    
    if (filters.categoryOfEngagement?.length) {
      query.categoryOfEngagement = { $in: filters.categoryOfEngagement };
    }
    
    if (filters.employer) {
      query.employer = new RegExp(filters.employer, 'i');
    }
    
    if (filters.city) {
      query.city = new RegExp(filters.city, 'i');
    }
    
    if (filters.yearsWithOrganization) {
      if (filters.yearsWithOrganization.min !== undefined) {
        query.yearsWithOrganization = { ...query.yearsWithOrganization, $gte: filters.yearsWithOrganization.min };
      }
      if (filters.yearsWithOrganization.max !== undefined) {
        query.yearsWithOrganization = { ...query.yearsWithOrganization, $lte: filters.yearsWithOrganization.max };
      }
    }
    
    if (filters.tags?.length) {
      const tagConditions = filters.tags.map(tag => ({
        [`tags.${tag.name}`]: tag.value
      }));
      
      if (tagConditions.length === 1) {
        Object.assign(query, tagConditions[0]);
      } else {
        query.$and = tagConditions;
      }
    }
    
    return query;
  }
  
  /**
   * Build complex prospect query from filters
   */
  static buildProspectQuery(orgId, filters) {
    const query = { orgId };
    
    if (filters.relationshipToMember?.length) {
      query.relationshipToMember = { $in: filters.relationshipToMember };
    }
    
    if (filters.howDidYouMeet?.length) {
      query.howDidYouMeet = { $in: filters.howDidYouMeet };
    }
    
    if (filters.eventInterest?.length) {
      query.eventInterest = { $in: filters.eventInterest };
    }
    
    if (filters.tags?.length) {
      const tagConditions = filters.tags.map(tag => ({
        [`tags.${tag.name}`]: tag.value
      }));
      
      if (tagConditions.length === 1) {
        Object.assign(query, tagConditions[0]);
      } else {
        query.$and = tagConditions;
      }
    }
    
    return query;
  }
  
  /**
   * Get the current stage of a contact in the pipeline
   */
  static getContactStage(contactId, pipelineEntries) {
    for (const entry of pipelineEntries) {
      if (entry.supporterIds.includes(contactId)) {
        return entry.stage;
      }
    }
    return null;
  }
  
  /**
   * Update contact count for a list
   */
  static async updateContactCount(contactList) {
    let count = 0;
    
    try {
      const contacts = await this.getContactsForList(contactList._id);
      count = contacts.length;
    } catch (error) {
      console.error("Error calculating contact count:", error);
      // Fallback to stored count
      count = contactList.totalContacts || 0;
    }
    
    contactList.totalContacts = count;
    contactList.lastUpdated = new Date();
    await contactList.save();
    
    return count;
  }
  
  /**
   * Track usage of a contact list
   */
  static async trackUsage(contactList) {
    contactList.usageCount = (contactList.usageCount || 0) + 1;
    contactList.lastUsed = new Date();
    await contactList.save();
  }
  
  /**
   * Build list data based on type and criteria
   */
  static async buildListData(listData) {
    const { orgId, name, description, type, criteria, supporterIds, prospectIds, createdBy } = listData;
    
    const baseData = {
      orgId,
      name,
      description,
      type,
      createdBy: createdBy || "admin"
    };
    
    switch (type) {
      case "manual":
        return {
          ...baseData,
          supporterIds: supporterIds || [],
          prospectIds: prospectIds || []
        };
        
      case "pipeline":
        if (!criteria?.eventId || !criteria?.audienceType || !criteria?.stage) {
          throw new Error("Pipeline lists require eventId, audienceType, and stage");
        }
        return {
          ...baseData,
          eventId: criteria.eventId,
          audienceType: criteria.audienceType,
          stages: [criteria.stage]
        };
        
      case "tag_based":
        if (!criteria?.tagName || !criteria?.tagValue) {
          throw new Error("Tag-based lists require tagName and tagValue");
        }
        return {
          ...baseData,
          filters: {
            supporterFilters: {
              tags: [{ name: criteria.tagName, value: criteria.tagValue }]
            }
          }
        };
        
      case "dynamic":
        if (!criteria?.filters) {
          throw new Error("Dynamic lists require filters criteria");
        }
        return {
          ...baseData,
          filters: criteria.filters
        };
        
      default:
        throw new Error(`Unknown list type: ${type}`);
    }
  }
  
  /**
   * Refresh a dynamic list (recalculate contacts)
   */
  static async refreshDynamicList(listId) {
    const contactList = await ContactList.findById(listId);
    if (!contactList) {
      throw new Error("Contact list not found");
    }
    
    if (contactList.type !== "dynamic") {
      throw new Error("Only dynamic lists can be refreshed");
    }
    
    const contacts = await this.getDynamicContacts(contactList);
    await this.updateContactCount(contactList);
    
    return {
      contacts,
      totalContacts: contacts.length,
      lastUpdated: contactList.lastUpdated
    };
  }
  
  /**
   * Get list statistics
   */
  static async getListStats(listId) {
    const contactList = await ContactList.findById(listId);
    if (!contactList) {
      throw new Error("Contact list not found");
    }
    
    const contacts = await this.getContactsForList(listId);
    
    // Calculate stats
    const stats = {
      totalContacts: contacts.length,
      supporters: contacts.filter(c => c.type === 'supporter').length,
      prospects: contacts.filter(c => c.type === 'prospect').length,
      lastUpdated: contactList.lastUpdated,
      usageCount: contactList.usageCount || 0,
      lastUsed: contactList.lastUsed
    };
    
    return stats;
  }
}

export default ContactListService;
