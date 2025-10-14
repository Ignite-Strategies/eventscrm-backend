import { getPrismaClient } from "../config/database.js";

const prisma = getPrismaClient();

/**
 * ContactListHydrate - Pure hydration logic
 * Loads contact lists with their contacts and relationships
 */
class ContactListHydrate {
  
  /**
   * Get all contacts for a specific list
   */
  static async getContactsForList(listId) {
    console.log('💧 Hydrating contacts for list:', listId);
    
    const contacts = await prisma.contact.findMany({
      where: { contactListId: listId },
      include: {
        orgMember: true,
        eventAttendees: {
          include: {
            event: true
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });
    
    console.log('💧 Found contacts for list:', contacts.length);
    return contacts;
  }
  
  /**
   * Get contact list with basic info
   */
  static async getContactList(listId) {
    console.log('💧 Hydrating contact list:', listId);
    
    const contactList = await prisma.contactList.findUnique({
      where: { id: listId },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    
    if (!contactList) {
      throw new Error("Contact list not found");
    }
    
    console.log('💧 Contact list hydrated:', contactList.name);
    return contactList;
  }
  
  /**
   * Get contact list with contact count
   */
  static async getContactListWithCount(listId) {
    console.log('💧 Hydrating contact list with count:', listId);
    
    const contactList = await this.getContactList(listId);
    
    // Get actual contact count
    const contactCount = await prisma.contact.count({
      where: { contactListId: listId }
    });
    
    // Update the stored count if it's different
    if (contactList.totalContacts !== contactCount) {
      await prisma.contactList.update({
        where: { id: listId },
        data: { totalContacts: contactCount }
      });
      contactList.totalContacts = contactCount;
    }
    
    console.log('💧 Contact list count:', contactCount);
    return { ...contactList, actualContactCount: contactCount };
  }
  
  /**
   * Get all contact lists for an org with counts
   */
  static async getContactListsForOrg(orgId) {
    console.log('💧 Hydrating contact lists for org:', orgId);
    
    const contactLists = await prisma.contactList.findMany({
      where: { 
        orgId,
        isActive: true 
      },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Get actual counts for each list
    const listsWithCounts = await Promise.all(
      contactLists.map(async (list) => {
        const actualCount = await prisma.contact.count({
          where: { contactListId: list.id }
        });
        
        return {
          ...list,
          actualContactCount: actualCount
        };
      })
    );
    
    console.log('💧 Found contact lists for org:', listsWithCounts.length);
    return listsWithCounts;
  }
  
  /**
   * Get contact list with enriched contact data
   */
  static async getContactListWithContacts(listId) {
    console.log('💧 Hydrating contact list with full contact data:', listId);
    
    const contactList = await this.getContactListWithCount(listId);
    const contacts = await this.getContactsForList(listId);
    
    return {
      ...contactList,
      contacts
    };
  }
  
  /**
   * Get contact list usage (which campaigns use it)
   */
  static async getContactListUsage(listId) {
    console.log('💧 Hydrating contact list usage:', listId);
    
    const campaigns = await prisma.campaign.findMany({
      where: { contactListId: listId },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('💧 Contact list used by campaigns:', campaigns.length);
    return campaigns;
  }
  
  /**
   * Get contact list with full context (list + contacts + usage)
   */
  static async getContactListFullContext(listId) {
    console.log('💧 Hydrating full contact list context:', listId);
    
    const [contactList, contacts, campaigns] = await Promise.all([
      this.getContactListWithCount(listId),
      this.getContactsForList(listId),
      this.getContactListUsage(listId)
    ]);
    
    return {
      ...contactList,
      contacts,
      campaigns,
      totalContacts: contacts.length
    };
  }
}

export default ContactListHydrate;
