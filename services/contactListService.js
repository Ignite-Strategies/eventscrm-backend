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
    console.log('📞 Getting contacts for list (SIMPLE):', listId);
    
    const contacts = await prisma.contact.findMany({
      where: { contactListId: listId },
      include: {
        orgMember: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });
    
    // Transform contacts to flatten orgMember data for frontend
    const transformedContacts = contacts.map(contact => ({
      ...contact,
      goesBy: contact.orgMember?.goesBy || contact.firstName,
      // Add other orgMember fields if needed
      memberSince: contact.orgMember?.memberSince,
      memberType: contact.orgMember?.memberType,
      isActive: contact.orgMember?.isActive
    }));
    
    console.log('📞 Found contacts (SIMPLE):', transformedContacts.length);
    console.log('📞 Sample contact data:', transformedContacts[0] ? {
      firstName: transformedContacts[0].firstName,
      goesBy: transformedContacts[0].goesBy,
      hasOrgMember: !!transformedContacts[0].orgMember
    } : 'No contacts');
    
    return transformedContacts;
  }
  
  /**
   * Assign specific contacts to a list - SIMPLE!
   */
  static async assignContactsToList(listId, contactIds) {
    console.log('📋 Assigning contacts to list (SIMPLE):', listId, 'count:', contactIds.length);
    
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
    console.log('💧 Getting contact list with contacts (SIMPLE):', listId);
    
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
}

export default ContactListService;
