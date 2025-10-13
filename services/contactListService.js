import { getPrismaClient } from "../config/database.js";

const prisma = getPrismaClient();

class ContactListService {
  
  /**
   * Create a new contact list with proper validation and setup
   */
  static async createContactList(listData) {
    const { orgId, name, type } = listData;
    
    // Validate required fields
    if (!orgId || !name || !type) {
      throw new Error("orgId, name, and type are required");
    }
    
    // Check for duplicate names
    const existingList = await prisma.contactList.findFirst({ 
      where: { orgId, name } 
    });
    if (existingList) {
      throw new Error("Contact list name already exists for this organization");
    }
    
    // Build list data based on type
    const contactListData = await this.buildListData(listData);
    
    // Create the list
    const contactList = await prisma.contactList.create({
      data: contactListData
    });
    
    // Find matching contacts and set their contactListId
    await this.populateContactList(contactList);
    
    return contactList;
  }
  
  /**
   * Get all contacts for a specific list (THE CLEAN WAY!)
   */
  static async getContactsForList(listId) {
    // SIMPLE QUERY - Just look for contacts with this contactListId!
    const contacts = await prisma.contact.findMany({
      where: { contactListId: listId },
      include: {
        orgMember: true,
        eventAttendees: {
          include: {
            event: true
          }
        }
      }
    });
    
    // Update usage tracking
    const contactList = await prisma.contactList.findUnique({
      where: { id: listId }
    });
    if (contactList) {
      await this.trackUsage(contactList);
    }
    
    return contacts;
  }
  
  /**
   * Populate contact list by setting contactListId on matching contacts
   */
  static async populateContactList(contactList) {
    let matchingContacts = [];
    
    switch (contactList.type) {
      case "contact":
        matchingContacts = await this.getGeneralContacts(contactList);
        break;
        
      case "org_member":
        matchingContacts = await this.getOrgMemberContacts(contactList);
        break;
        
      case "event_attendee":
        matchingContacts = await this.getEventAttendeeContacts(contactList);
        break;
        
      default:
        throw new Error(`Unknown list type: ${contactList.type}`);
    }
    
    // Set contactListId on all matching contacts
    const contactIds = matchingContacts.map(c => c.id);
    
    await prisma.contact.updateMany({
      where: { id: { in: contactIds } },
      data: { contactListId: contactList.id }
    });
    
    console.log(`✅ Populated ${contactIds.length} contacts in list "${contactList.name}"`);
    
    // Update contact count
    await prisma.contactList.update({
      where: { id: contactList.id },
      data: { 
        totalContacts: contactIds.length,
        lastUpdated: new Date()
      }
    });
    
    return contactIds.length;
  }
  
  /**
   * Get general contacts (everyone in the CRM)
   * Contacts related to org through EventAttendees OR OrgMember
   */
  static async getGeneralContacts(contactList) {
    // Get all contacts that have EventAttendees for this org
    const contactsViaEvents = await prisma.contact.findMany({
      where: {
        eventAttendees: {
          some: {
            orgId: contactList.orgId
          }
        }
      },
      include: {
        orgMember: true,
        eventAttendees: {
          where: {
            orgId: contactList.orgId
          },
          include: {
            event: true
          }
        }
      }
    });
    
    // Get all contacts that have OrgMember for this org
    const contactsViaOrgMember = await prisma.contact.findMany({
      where: {
        orgMember: {
          orgId: contactList.orgId
        }
      },
      include: {
        orgMember: true,
        eventAttendees: {
          where: {
            orgId: contactList.orgId
          },
          include: {
            event: true
          }
        }
      }
    });
    
    // Merge and deduplicate contacts by ID
    const contactMap = new Map();
    
    [...contactsViaEvents, ...contactsViaOrgMember].forEach(contact => {
      if (!contactMap.has(contact.id)) {
        contactMap.set(contact.id, contact);
      }
    });
    
    return Array.from(contactMap.values());
  }
  
  /**
   * Get org member contacts
   * Contacts that have been elevated to OrgMember status for this org
   */
  static async getOrgMemberContacts(contactList) {
    return await prisma.contact.findMany({
      where: {
        orgMember: {
          orgId: contactList.orgId
        }
      },
      include: {
        orgMember: true,
        eventAttendees: {
          where: {
            orgId: contactList.orgId
          },
          include: {
            event: true
          }
        }
      }
    });
  }
  
  /**
   * Get event attendee contacts (event pipeline)
   */
  static async getEventAttendeeContacts(contactList) {
    const { eventId, audienceType, stages } = contactList;
    
    if (!eventId) {
      throw new Error("Event ID is required for event attendee lists");
    }
    
    // Build where clause
    const whereClause = {
      eventId,
      contact: {
        orgId: contactList.orgId
      }
    };
    
    // Filter by audience type if specified
    if (audienceType) {
      whereClause.audienceType = audienceType;
    }
    
    // Filter by stages if specified
    if (stages && stages.length > 0) {
      whereClause.currentStage = { in: stages };
    }
    
    return await prisma.contact.findMany({
      where: {
        eventAttendees: {
          some: whereClause
        }
      },
      include: {
        orgMember: true,
        eventAttendees: {
          where: whereClause,
          include: {
            event: true
          }
        }
      }
    });
  }
  
  /**
   * Build contact list data based on type
   */
  static async buildListData(listData) {
    const { orgId, name, description, type, criteria } = listData;
    
    const baseData = {
      orgId,
      name,
      description,
      type,
      isActive: true,
      totalContacts: 0,
      usageCount: 0
    };
    
    switch (type) {
      case "contact":
        // General contacts - no additional fields needed
        break;
        
      case "org_member":
        // Org member contacts - no additional fields needed
        break;
        
      case "event_attendee":
        // Event attendee contacts - need event and filters
        if (!criteria?.eventId) {
          throw new Error("Event ID is required for event attendee lists");
        }
        baseData.eventId = criteria.eventId;
        baseData.audienceType = criteria.audienceType;
        baseData.stages = criteria.stages || [];
        break;
        
      default:
        throw new Error(`Unknown list type: ${type}`);
    }
    
    return baseData;
  }

  /**
   * Get contacts based on tag criteria (DEPRECATED - keeping for compatibility)
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
