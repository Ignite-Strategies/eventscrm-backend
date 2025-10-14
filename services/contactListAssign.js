import { getPrismaClient } from "../config/database.js";

const prisma = getPrismaClient();

/**
 * ContactListAssign - Pure assignment logic
 * Takes a contact list and assigns contacts to it based on type
 */
class ContactListAssign {
  
  /**
   * Assign contacts to a list based on its type
   */
  static async assignContactsToList(contactList) {
    console.log('📋 Assigning contacts to list:', contactList.id, 'type:', contactList.type);
    
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
        
      case "manual_selection":
        // For manual selection, contacts are already specified
        console.log('📋 Manual selection - no assignment needed');
        return { contactIds: [], assignedCount: 0 };
        
      default:
        throw new Error(`Unknown list type: ${contactList.type}`);
    }
    
    console.log('📋 Found matching contacts:', matchingContacts.length);
    
    if (matchingContacts.length === 0) {
      console.warn('⚠️ No contacts found for list type:', contactList.type);
      return { contactIds: [], assignedCount: 0 };
    }
    
    // Set contactListId on all matching contacts
    const contactIds = matchingContacts.map(c => c.id);
    
    const updateResult = await prisma.contact.updateMany({
      where: { id: { in: contactIds } },
      data: { contactListId: contactList.id }
    });
    
    console.log('✅ Assigned contacts to list:', updateResult.count);
    
    // Update contact count on the list
    await this.updateContactCount(contactList.id);
    
    return { contactIds, assignedCount: updateResult.count };
  }
  
  /**
   * Assign specific contacts to a list (for manual selection)
   */
  static async assignSpecificContacts(listId, contactIds) {
    console.log('📋 Assigning specific contacts to list:', listId, 'count:', contactIds.length);
    
    if (!contactIds || contactIds.length === 0) {
      console.warn('⚠️ No contact IDs provided for assignment');
      return { assignedCount: 0 };
    }
    
    const updateResult = await prisma.contact.updateMany({
      where: { id: { in: contactIds } },
      data: { contactListId: listId }
    });
    
    console.log('✅ Assigned specific contacts:', updateResult.count);
    
    // Update contact count
    await this.updateContactCount(listId);
    
    return { assignedCount: updateResult.count };
  }
  
  /**
   * Update the contact count on a list
   */
  static async updateContactCount(listId) {
    const count = await prisma.contact.count({
      where: { contactListId: listId }
    });
    
    await prisma.contactList.update({
      where: { id: listId },
      data: { totalContacts: count }
    });
    
    console.log('📊 Updated contact count for list:', listId, 'count:', count);
    return count;
  }
  
  /**
   * Get general contacts (all contacts for org)
   */
  static async getGeneralContacts(contactList) {
    console.log('🔍 Getting general contacts for org:', contactList.orgId);
    
    const contacts = await prisma.contact.findMany({
      where: {
        email: { not: null } // Only contacts with emails
      },
      include: {
        orgMember: true
      }
    });
    
    console.log('🔍 Found general contacts:', contacts.length);
    return contacts;
  }
  
  /**
   * Get org member contacts
   */
  static async getOrgMemberContacts(contactList) {
    console.log('🔍 Getting org member contacts for org:', contactList.orgId);
    
    const contacts = await prisma.contact.findMany({
      where: {
        orgMember: {
          orgId: contactList.orgId
        }
      },
      include: {
        orgMember: true
      }
    });
    
    console.log('🔍 Found org member contacts:', contacts.length);
    console.log('🔍 Contact details:', contacts.map(c => ({ 
      id: c.id, 
      email: c.email, 
      hasOrgMember: !!c.orgMember,
      orgMemberOrgId: c.orgMember?.orgId 
    })));
    
    return contacts;
  }
  
  /**
   * Get event attendee contacts
   */
  static async getEventAttendeeContacts(contactList) {
    console.log('🔍 Getting event attendee contacts for org:', contactList.orgId);
    
    const contacts = await prisma.contact.findMany({
      where: {
        eventAttendees: {
          some: {
            orgId: contactList.orgId
          }
        }
      },
      include: {
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
    
    console.log('🔍 Found event attendee contacts:', contacts.length);
    return contacts;
  }
}

export default ContactListAssign;
