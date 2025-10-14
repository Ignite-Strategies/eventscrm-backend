import { getPrismaClient } from "../config/database.js";
import { mapToOfficialStage, OFFICIAL_AUDIENCES, AUDIENCE_STAGES } from "../config/pipelineConfig.js";

const prisma = getPrismaClient();

/**
 * Smart List Service - Auto-creates and maintains standard lists
 * These lists are dynamically hydrated as contacts are added
 */
class SmartListService {
  
  /**
   * Smart List Templates
   * These define the standard lists that should exist for every event
   */
  static SMART_LIST_TEMPLATES = {
    // Event-based lists
    EVENT_ALL_STAGES: {
      nameTemplate: "{eventName} - All Stages",
      description: "All contacts in this event pipeline, regardless of stage",
      type: "event_attendee",
      getConfig: (event) => ({
        eventId: event.id,
        audienceType: null, // All audiences
        stages: [] // All stages
      })
    },
    
    EVENT_RSVP: {
      nameTemplate: "{eventName} - RSVPs (Paid)",
      description: "Confirmed attendees who have paid - can't wait to see you!",
      type: "event_attendee",
      getConfig: (event) => ({
        eventId: event.id,
        audienceType: null,
        stages: ["paid"]
      })
    },
    
    EVENT_SOFT_COMMITS: {
      nameTemplate: "{eventName} - Soft Commits",
      description: "People who said yes but haven't paid yet",
      type: "event_attendee",
      getConfig: (event) => ({
        eventId: event.id,
        audienceType: null,
        stages: ["rsvped"]
      })
    },
    
    EVENT_HOT_LEADS: {
      nameTemplate: "{eventName} - Hot Leads",
      description: "Expressed interest - high conversion potential",
      type: "event_attendee",
      getConfig: (event) => ({
        eventId: event.id,
        audienceType: null,
        stages: ["expressed_interest"]
      })
    },
    
    EVENT_IN_FUNNEL: {
      nameTemplate: "{eventName} - In Funnel",
      description: "Everyone we're tracking for this event",
      type: "event_attendee",
      getConfig: (event) => ({
        eventId: event.id,
        audienceType: null,
        stages: ["in_funnel", "general_awareness", "personal_invite"]
      })
    },
    
    // Org Member lists
    ORG_MEMBERS_ALL: {
      nameTemplate: "F3 Members - All Active",
      description: "All org members - hey guys, come support!",
      type: "org_member",
      getConfig: () => ({})
    },
    
    ORG_MEMBERS_EVENT_RSVP: {
      nameTemplate: "{eventName} - F3 Member RSVPs",
      description: "Org members who RSVP'd to this event",
      type: "event_attendee",
      getConfig: (event) => ({
        eventId: event.id,
        audienceType: "org_member",
        stages: ["paid"]
      })
    },
    
    ORG_MEMBERS_NOT_RSVP: {
      nameTemplate: "{eventName} - F3 Members (Not RSVP'd)",
      description: "Org members who haven't committed yet - nudge them!",
      type: "event_attendee",
      getConfig: (event) => ({
        eventId: event.id,
        audienceType: "org_member",
        stages: ["in_funnel", "general_awareness", "personal_invite", "expressed_interest", "rsvped"]
      })
    },
    
    // Stage Champions (if you have that concept)
    STAGE_CHAMPIONS_ALL: {
      nameTemplate: "Stage Champions - All",
      description: "All stage champions across the org",
      type: "org_member", // Assuming champions are org members
      getConfig: () => ({
        // Could add tag-based filtering here if you have a "champion" tag
      })
    }
  };
  
  /**
   * Create all smart lists for an event
   * Called automatically when event is created
   */
  static async createSmartListsForEvent(event, orgId) {
    const createdLists = [];
    
    try {
      console.log(`🚀 Creating smart lists for event: ${event.name}`);
      
      // Event-specific lists
      const eventTemplates = [
        'EVENT_ALL_STAGES',
        'EVENT_RSVP',
        'EVENT_SOFT_COMMITS',
        'EVENT_HOT_LEADS',
        'EVENT_IN_FUNNEL',
        'ORG_MEMBERS_EVENT_RSVP',
        'ORG_MEMBERS_NOT_RSVP'
      ];
      
      for (const templateKey of eventTemplates) {
        const template = this.SMART_LIST_TEMPLATES[templateKey];
        const name = template.nameTemplate.replace('{eventName}', event.name);
        const config = template.getConfig(event);
        
        // Check if list already exists
        const existing = await prisma.contactList.findFirst({
          where: {
            orgId,
            name,
            isActive: true
          }
        });
        
        if (existing) {
          console.log(`  ⏭️  List already exists: ${name}`);
          createdLists.push(existing);
          continue;
        }
        
        // Create the list
        const list = await prisma.contactList.create({
          data: {
            orgId,
            name,
            description: template.description,
            type: template.type,
            eventId: config.eventId || null,
            audienceType: config.audienceType || null,
            stages: config.stages || [],
            isActive: true,
            totalContacts: 0,
            usageCount: 0,
            tags: ['smart-list', 'auto-created'],
            createdBy: 'system'
          }
        });
        
        console.log(`  ✅ Created: ${name}`);
        createdLists.push(list);
        
        // Populate the list with contacts
        await this.populateSmartList(list);
      }
      
      console.log(`✅ Created ${createdLists.length} smart lists for ${event.name}`);
      return createdLists;
      
    } catch (error) {
      console.error("Error creating smart lists:", error);
      throw error;
    }
  }
  
  /**
   * Create org-wide smart lists (not event-specific)
   * Called once when org is created or on-demand
   */
  static async createOrgSmartLists(orgId) {
    const createdLists = [];
    
    try {
      console.log(`🚀 Creating org-wide smart lists`);
      
      const orgTemplates = [
        'ORG_MEMBERS_ALL',
        'STAGE_CHAMPIONS_ALL'
      ];
      
      for (const templateKey of orgTemplates) {
        const template = this.SMART_LIST_TEMPLATES[templateKey];
        const name = template.nameTemplate;
        const config = template.getConfig();
        
        // Check if list already exists
        const existing = await prisma.contactList.findFirst({
          where: {
            orgId,
            name,
            isActive: true
          }
        });
        
        if (existing) {
          console.log(`  ⏭️  List already exists: ${name}`);
          createdLists.push(existing);
          continue;
        }
        
        // Create the list
        const list = await prisma.contactList.create({
          data: {
            orgId,
            name,
            description: template.description,
            type: template.type,
            isActive: true,
            totalContacts: 0,
            usageCount: 0,
            tags: ['smart-list', 'auto-created', 'org-wide'],
            createdBy: 'system'
          }
        });
        
        console.log(`  ✅ Created: ${name}`);
        createdLists.push(list);
        
        // Populate the list
        await this.populateSmartList(list);
      }
      
      console.log(`✅ Created ${createdLists.length} org-wide smart lists`);
      return createdLists;
      
    } catch (error) {
      console.error("Error creating org smart lists:", error);
      throw error;
    }
  }
  
  /**
   * Populate a smart list with matching contacts
   */
  static async populateSmartList(list) {
    try {
      let matchingContacts = [];
      
      switch (list.type) {
        case "contact":
          // All contacts
          matchingContacts = await this.getGeneralContacts(list);
          break;
          
        case "org_member":
          // Org members
          matchingContacts = await this.getOrgMemberContacts(list);
          break;
          
        case "event_attendee":
          // Event pipeline contacts
          matchingContacts = await this.getEventAttendeeContacts(list);
          break;
      }
      
      // Set contactListId on matching contacts
      const contactIds = matchingContacts.map(c => c.id);
      
      if (contactIds.length > 0) {
        await prisma.contact.updateMany({
          where: { id: { in: contactIds } },
          data: { contactListId: list.id }
        });
      }
      
      // Update contact count
      await prisma.contactList.update({
        where: { id: list.id },
        data: {
          totalContacts: contactIds.length,
          lastUpdated: new Date()
        }
      });
      
      console.log(`    📊 Populated with ${contactIds.length} contacts`);
      return contactIds.length;
      
    } catch (error) {
      console.error(`Error populating smart list ${list.name}:`, error);
      return 0;
    }
  }
  
  /**
   * Get general contacts
   */
  static async getGeneralContacts(list) {
    const contactsViaEvents = await prisma.contact.findMany({
      where: {
        eventAttendees: {
          some: { orgId: list.orgId }
        }
      },
      include: {
        orgMember: true,
        eventAttendees: {
          where: { orgId: list.orgId }
        }
      }
    });
    
    const contactsViaOrgMember = await prisma.contact.findMany({
      where: {
        orgMember: { orgId: list.orgId }
      },
      include: {
        orgMember: true,
        eventAttendees: {
          where: { orgId: list.orgId }
        }
      }
    });
    
    // Deduplicate
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
   */
  static async getOrgMemberContacts(list) {
    return await prisma.contact.findMany({
      where: {
        orgMember: { orgId: list.orgId }
      },
      include: {
        orgMember: true
      }
    });
  }
  
  /**
   * Get event attendee contacts
   */
  static async getEventAttendeeContacts(list) {
    const whereClause = {
      eventId: list.eventId,
      orgId: list.orgId
    };
    
    // Filter by audience type if specified
    if (list.audienceType) {
      whereClause.audienceType = list.audienceType;
    }
    
    // Filter by stages if specified
    if (list.stages && list.stages.length > 0) {
      whereClause.currentStage = { in: list.stages };
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
          where: whereClause
        }
      }
    });
  }
  
  /**
   * Refresh all smart lists for an event
   * Call this when pipeline changes happen
   */
  static async refreshEventSmartLists(eventId) {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });
      
      if (!event) {
        throw new Error("Event not found");
      }
      
      // Find all smart lists for this event
      const lists = await prisma.contactList.findMany({
        where: {
          eventId,
          tags: { has: 'smart-list' },
          isActive: true
        }
      });
      
      console.log(`🔄 Refreshing ${lists.length} smart lists for event ${event.name}`);
      
      for (const list of lists) {
        await this.populateSmartList(list);
      }
      
      console.log(`✅ Refreshed all smart lists`);
      return lists.length;
      
    } catch (error) {
      console.error("Error refreshing event smart lists:", error);
      throw error;
    }
  }
  
  /**
   * Refresh all org-wide smart lists
   */
  static async refreshOrgSmartLists(orgId) {
    try {
      const lists = await prisma.contactList.findMany({
        where: {
          orgId,
          tags: { has: 'org-wide' },
          isActive: true
        }
      });
      
      console.log(`🔄 Refreshing ${lists.length} org-wide smart lists`);
      
      for (const list of lists) {
        await this.populateSmartList(list);
      }
      
      console.log(`✅ Refreshed all org-wide smart lists`);
      return lists.length;
      
    } catch (error) {
      console.error("Error refreshing org smart lists:", error);
      throw error;
    }
  }
  
  /**
   * Get latest event for org
   */
  static async getLatestEvent(orgId) {
    return await prisma.event.findFirst({
      where: { orgId },
      orderBy: { startDateTime: 'desc' }
    });
  }
  
  /**
   * Create smart lists for latest event
   * Convenience method for "event-latest" concept
   */
  static async createSmartListsForLatestEvent(orgId) {
    const latestEvent = await this.getLatestEvent(orgId);
    
    if (!latestEvent) {
      throw new Error("No events found for this org");
    }
    
    return await this.createSmartListsForEvent(latestEvent, orgId);
  }
}

export default SmartListService;

