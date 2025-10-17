import { getPrismaClient } from "../config/database.js";

const prisma = getPrismaClient();

/**
 * SIMPLE Contact List Service - No overengineering, just works!
 */
class ContactListService {
  
  /**
   * Create a contact list and assign contacts - SIMPLE!
   */
  static async createContactList(listData) {
    const { orgId, name, type, description } = listData;
    
    console.log('🏗️ Creating simple contact list:', { orgId, name, type });
    
    // Validate required fields
    if (!orgId || !name || !type) {
      throw new Error("orgId, name, and type are required");
    }
    
    // Create the list
    const contactList = await prisma.contactList.create({
      data: {
        orgId,
        name,
        type,
        description: description || `Contact list of type: ${type}`,
        totalContacts: 0
      }
    });
    
    console.log('✅ Simple contact list created:', contactList.id);
    return contactList;
  }
  
  /**
   * Get contacts for a list - SIMPLE!
   */
  static async getContactsForList(listId) {
    
    const contacts = await prisma.contact.findMany({
      where: { contactListId: listId },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });
    
    console.log(`✅ Found ${contacts.length} contacts for list ${listId}`);
    
    return contacts;
  }
  
  /**
   * Assign specific contacts to a list - SIMPLE!
   */
  static async assignContactsToList(listId, contactIds) {
    
    if (!contactIds || contactIds.length === 0) {
      console.warn('⚠️ No contact IDs provided');
      return { assignedCount: 0 };
    }
    
    // Assign the contacts
    const updateResult = await prisma.contact.updateMany({
      where: { id: { in: contactIds } },
      data: { contactListId: listId }
    });
    
    console.log('✅ Assigned contacts (SIMPLE):', updateResult.count);
    
    // Update the contact count
    await prisma.contactList.update({
      where: { id: listId },
      data: { totalContacts: updateResult.count }
    });
    
    console.log('📊 Updated contact count (SIMPLE):', updateResult.count);
    return { assignedCount: updateResult.count };
  }
  
  /**
   * Get contact list with contacts - SIMPLE!
   */
  static async getContactListWithContacts(listId) {
    
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
    
    const contacts = await this.getContactsForList(listId);
    
    return {
      ...contactList,
      contacts,
      contactCount: contacts.length
    };
  }

  /**
   * Update contact count for a list - FIXES STALE COUNTS!
   */
  static async updateContactCount(contactList) {
    if (!contactList) {
      console.warn('⚠️ No contact list provided for count update');
      return;
    }

    try {
      // Count actual contacts in the list
      const actualCount = await prisma.contact.count({
        where: { contactListId: contactList.id }
      });

      // Update the count if it's different
      if (actualCount !== contactList.totalContacts) {
        await prisma.contactList.update({
          where: { id: contactList.id },
          data: { 
            totalContacts: actualCount,
            lastUpdated: new Date()
          }
        });

        console.log(`📊 Updated contact count for "${contactList.name}": ${contactList.totalContacts} → ${actualCount}`);
      }

      return actualCount;
    } catch (error) {
      console.error('❌ Error updating contact count:', error);
      throw error;
    }
  }

  /**
   * Update contact count for a specific list ID
   */
  static async updateContactCountById(listId) {
    try {
      const contactList = await prisma.contactList.findUnique({
        where: { id: listId }
      });

      if (!contactList) {
        console.warn(`⚠️ Contact list ${listId} not found`);
        return 0;
      }

      return await this.updateContactCount(contactList);
    } catch (error) {
      console.error('❌ Error updating contact count by ID:', error);
      throw error;
    }
  }
}

export default ContactListService;
