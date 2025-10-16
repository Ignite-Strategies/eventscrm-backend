                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                import { getPrismaClient } from "../config/database.js";
import SmartListService from "./smartListService.js";

const prisma = getPrismaClient();

/**
 * Campaign Contact Service
 * Handles getting contacts for campaigns with smart refresh
 */
class CampaignContactService {
  
  /**
   * Get contacts for a campaign
   * Automatically refreshes smart lists if stale
   */
  static async getContactsForCampaign(contactListId, options = {}) {
    const {
      autoRefresh = true,
      staleThresholdMinutes = 5,
      fields = ['id', 'firstName', 'lastName', 'email', 'phone']
    } = options;
    
    try {
      // Get the contact list
      const contactList = await prisma.contactList.findUnique({
        where: { id: contactListId }
      });
      
      if (!contactList) {
        throw new Error("Contact list not found");
      }
      
      // Check if list needs refresh
      if (autoRefresh && this.isStale(contactList, staleThresholdMinutes)) {
        console.log(`🔄 List "${contactList.name}" is stale, refreshing...`);
        await this.refreshList(contactList);
      }
      
      // Get contacts from list with orgMember data for personalization
      const contacts = await prisma.contact.findMany({
        where: {
          contactListId: contactListId,
          email: { not: null } // Only contacts with email
        },
        include: {
          orgMember: true
        }
      });
      
      // Transform contacts to flatten orgMember data and include requested fields
      const transformedContacts = contacts.map(contact => {
        const result = {
          ...contact,
          // Priority: contact.goesBy (universal) > orgMember.goesBy (org-specific) > firstName (fallback)
          goesBy: contact.goesBy || contact.orgMember?.goesBy || contact.firstName,
          // Include chapterresponsiblefor from orgMember
          chapterresponsiblefor: contact.orgMember?.chapterresponsiblefor,
          // Include only requested fields + goesBy
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone
        };
        
        // Add other requested fields if they exist
        fields.forEach(field => {
          if (contact[field] !== undefined) {
            result[field] = contact[field];
          }
        });
        
        return result;
      });
      
      console.log(`✅ Retrieved ${transformedContacts.length} contacts for campaign`);
      console.log(`✅ Sample contact goesBy:`, transformedContacts[0]?.goesBy || 'No contacts');
      
      // Update usage tracking
      await this.trackListUsage(contactList);
      
      return transformedContacts;
      
    } catch (error) {
      console.error("Error getting contacts for campaign:", error);
      throw error;
    }
  }
  
  /**
   * Check if a list is stale and needs refresh
   */
  static isStale(contactList, thresholdMinutes) {
    // Only auto-refresh smart lists
    if (!contactList.tags?.includes('smart-list')) {
      return false;
    }
    
    // Check last updated time
    const lastUpdated = new Date(contactList.lastUpdated || contactList.updatedAt);
    const now = new Date();
    const minutesSinceUpdate = (now - lastUpdated) / (1000 * 60);
    
    return minutesSinceUpdate > thresholdMinutes;
  }
  
  /**
   * Refresh a contact list
   */
  static async refreshList(contactList) {
    try {
      if (contactList.type === "event_attendee") {
        // Use smart list service for event-based lists
        await SmartListService.populateSmartList(contactList);
      } else if (contactList.type === "org_member") {
        // Refresh org member list
        await SmartListService.populateSmartList(contactList);
      } else {
        // General contact list
        await SmartListService.populateSmartList(contactList);
      }
      
      console.log(`✅ Refreshed list: ${contactList.name}`);
    } catch (error) {
      console.error(`Error refreshing list ${contactList.name}:`, error);
      // Don't throw - use existing data if refresh fails
    }
  }
  
  /**
   * Track usage of a contact list
   */
  static async trackListUsage(contactList) {
    await prisma.contactList.update({
      where: { id: contactList.id },
      data: {
        usageCount: { increment: 1 },
        lastUsed: new Date()
      }
    });
  }
  
  /**
   * Get contact count for a list (fast - no joins)
   */
  static async getContactCount(contactListId) {
    return await prisma.contact.count({
      where: {
        contactListId: contactListId,
        email: { not: null }
      }
    });
  }
  
  /**
   * Preview contacts for a campaign (first N contacts)
   */
  static async previewContacts(contactListId, limit = 10) {
    const contacts = await prisma.contact.findMany({
      where: {
        contactListId: contactListId,
        email: { not: null }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        goesBy: true
      },
      take: limit
    });
    
    const total = await this.getContactCount(contactListId);
    
    return {
      preview: contacts,
      total,
      showing: contacts.length
    };
  }
  
  /**
   * Get contacts grouped by field (for segmentation)
   */
  static async getContactsGrouped(contactListId, groupByField = 'audienceType') {
    const contacts = await prisma.contact.findMany({
      where: { contactListId: contactListId },
      include: {
        eventAttendees: true,
        orgMember: true
      }
    });
    
    // Group contacts
    const grouped = {};
    contacts.forEach(contact => {
      // Determine group key based on field
      let key = 'unknown';
      
      if (groupByField === 'audienceType') {
        key = contact.eventAttendees?.[0]?.audienceType || 'general';
      } else if (groupByField === 'stage') {
        key = contact.eventAttendees?.[0]?.currentStage || 'none';
      } else if (groupByField === 'isOrgMember') {
        key = contact.orgMember ? 'org_member' : 'prospect';
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(contact);
    });
    
    return grouped;
  }
  
  /**
   * Direct query approach (fallback)
   * Use this if you need absolute real-time data without list
   */
  static async getContactsDirectFromEvent(eventId, stages = [], audienceType = null) {
    const whereClause = {
      eventAttendees: {
        some: {
          eventId: eventId
        }
      }
    };
    
    // Add stage filter
    if (stages.length > 0) {
      whereClause.eventAttendees.some.currentStage = { in: stages };
    }
    
    // Add audience filter
    if (audienceType) {
      whereClause.eventAttendees.some.audienceType = audienceType;
    }
    
    const contacts = await prisma.contact.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        goesBy: true
      }
    });
    
    console.log(`✅ Retrieved ${contacts.length} contacts directly from event ${eventId}`);
    return contacts;
  }
  
  /**
   * Validate contacts before sending campaign
   */
  static async validateContacts(contacts) {
    const issues = {
      missingEmail: [],
      invalidEmail: [],
      valid: []
    };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    contacts.forEach(contact => {
      if (!contact.email) {
        issues.missingEmail.push(contact);
      } else if (!emailRegex.test(contact.email)) {
        issues.invalidEmail.push(contact);
      } else {
        issues.valid.push(contact);
      }
    });
    
    return {
      totalContacts: contacts.length,
      validContacts: issues.valid.length,
      missingEmail: issues.missingEmail.length,
      invalidEmail: issues.invalidEmail.length,
      issues
    };
  }
}

export default CampaignContactService;


