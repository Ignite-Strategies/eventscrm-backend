import { getPrismaClient } from "../config/database.js";

const prisma = getPrismaClient();

/**
 * ContactListCreate - Pure creation logic
 * Just creates the list record, no contact assignment
 */
class ContactListCreate {
  
  /**
   * Create a new contact list with validation
   */
  static async createContactList(listData) {
    const { orgId, name, type, description } = listData;
    
    console.log('🏗️ Creating contact list:', { orgId, name, type });
    
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
    
    // Create the list record
    const contactList = await prisma.contactList.create({
      data: {
        orgId,
        name,
        type,
        description: description || `Contact list of type: ${type}`,
        totalContacts: 0, // Will be updated by assignment service
        isActive: true
      }
    });
    
    console.log('✅ Contact list created:', contactList.id);
    return contactList;
  }
  
  /**
   * Create from selection (when user selects specific contacts)
   */
  static async createFromSelection(data) {
    const { orgId, name, description, selectedContactIds } = data;
    
    console.log('🏗️ Creating list from selection:', { orgId, name, contactCount: selectedContactIds.length });
    
    if (!orgId || !name || !selectedContactIds || selectedContactIds.length === 0) {
      throw new Error("orgId, name, and selectedContactIds are required");
    }
    
    // Create the list
    const contactList = await this.createContactList({
      orgId,
      name,
      type: 'manual_selection',
      description: description || 'Manually selected contacts'
    });
    
    return { contactList, selectedContactIds };
  }
}

export default ContactListCreate;
