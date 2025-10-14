import ContactListCreate from './contactListCreate.js';
import ContactListAssign from './contactListAssign.js';
import ContactListDelete from './contactListDelete.js';
import ContactListHydrate from './contactListHydrate.js';

/**
 * ContactListOrchestrator - Main service that orchestrates all contact list operations
 * Uses the modular services for clean separation of concerns
 */
class ContactListOrchestrator {
  
  /**
   * Create a new contact list with contacts assigned
   */
  static async createContactList(listData) {
    console.log('🎯 Orchestrating contact list creation:', listData.name);
    
    // Step 1: Create the list record
    const contactList = await ContactListCreate.createContactList(listData);
    
    // Step 2: Assign contacts based on type
    const assignmentResult = await ContactListAssign.assignContactsToList(contactList);
    
    console.log('🎯 Contact list creation complete:', {
      listId: contactList.id,
      assignedContacts: assignmentResult.assignedCount
    });
    
    return {
      ...contactList,
      assignedContacts: assignmentResult.assignedCount
    };
  }
  
  /**
   * Create from manual selection
   */
  static async createFromSelection(data) {
    console.log('🎯 Orchestrating manual selection creation:', data.name);
    
    // Step 1: Create the list
    const { contactList, selectedContactIds } = await ContactListCreate.createFromSelection(data);
    
    // Step 2: Assign the specific contacts
    const assignmentResult = await ContactListAssign.assignSpecificContacts(
      contactList.id, 
      selectedContactIds
    );
    
    console.log('🎯 Manual selection creation complete:', {
      listId: contactList.id,
      assignedContacts: assignmentResult.assignedCount
    });
    
    return {
      ...contactList,
      assignedContacts: assignmentResult.assignedCount
    };
  }
  
  /**
   * Get contact list with contacts
   */
  static async getContactListWithContacts(listId) {
    console.log('🎯 Orchestrating contact list hydration:', listId);
    
    return await ContactListHydrate.getContactListWithContacts(listId);
  }
  
  /**
   * Get all contact lists for org
   */
  static async getContactListsForOrg(orgId) {
    console.log('🎯 Orchestrating contact lists for org:', orgId);
    
    return await ContactListHydrate.getContactListsForOrg(orgId);
  }
  
  /**
   * Delete contact list
   */
  static async deleteContactList(listId) {
    console.log('🎯 Orchestrating contact list deletion:', listId);
    
    return await ContactListDelete.deleteContactList(listId);
  }
  
  /**
   * Soft delete contact list
   */
  static async softDeleteContactList(listId) {
    console.log('🎯 Orchestrating soft delete:', listId);
    
    return await ContactListDelete.softDeleteContactList(listId);
  }
  
  /**
   * Check if list can be deleted
   */
  static async canDeleteList(listId) {
    return await ContactListDelete.canDeleteList(listId);
  }
  
  /**
   * Get contact list full context
   */
  static async getContactListFullContext(listId) {
    console.log('🎯 Orchestrating full context hydration:', listId);
    
    return await ContactListHydrate.getContactListFullContext(listId);
  }
  
  /**
   * Refresh contact list (re-assign contacts)
   */
  static async refreshContactList(listId) {
    console.log('🎯 Orchestrating contact list refresh:', listId);
    
    // Get the list
    const contactList = await ContactListHydrate.getContactList(listId);
    
    // Clear existing assignments
    await ContactListAssign.clearListAssignments(listId);
    
    // Re-assign contacts
    const assignmentResult = await ContactListAssign.assignContactsToList(contactList);
    
    console.log('🎯 Contact list refresh complete:', {
      listId,
      assignedContacts: assignmentResult.assignedCount
    });
    
    return {
      listId,
      assignedContacts: assignmentResult.assignedCount
    };
  }
}

export default ContactListOrchestrator;
