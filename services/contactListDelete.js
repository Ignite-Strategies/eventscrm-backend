import { getPrismaClient } from "../config/database.js";

const prisma = getPrismaClient();

/**
 * ContactListDelete - Pure deletion logic
 * Handles safe deletion of contact lists and cleanup
 */
class ContactListDelete {
  
  /**
   * Delete a contact list and clean up relationships
   */
  static async deleteContactList(listId) {
    console.log('🗑️ Deleting contact list:', listId);
    
    // Check if list exists
    const contactList = await prisma.contactList.findUnique({
      where: { id: listId },
      include: {
        campaigns: true
      }
    });
    
    if (!contactList) {
      throw new Error("Contact list not found");
    }
    
    // Check if list is in use by campaigns
    if (contactList.campaigns && contactList.campaigns.length > 0) {
      const activeCampaigns = contactList.campaigns.filter(c => c.status !== 'draft');
      if (activeCampaigns.length > 0) {
        throw new Error(`Cannot delete list - it's being used by ${activeCampaigns.length} active campaigns`);
      }
    }
    
    // Remove contactListId from all contacts (soft unassign)
    const unassignResult = await prisma.contact.updateMany({
      where: { contactListId: listId },
      data: { contactListId: null }
    });
    
    console.log('📋 Unassigned contacts from list:', unassignResult.count);
    
    // Delete the list record
    await prisma.contactList.delete({
      where: { id: listId }
    });
    
    console.log('✅ Contact list deleted:', listId);
    
    return {
      deleted: true,
      unassignedContacts: unassignResult.count
    };
  }
  
  /**
   * Soft delete (deactivate) a contact list
   */
  static async softDeleteContactList(listId) {
    console.log('🗑️ Soft deleting contact list:', listId);
    
    const contactList = await prisma.contactList.findUnique({
      where: { id: listId }
    });
    
    if (!contactList) {
      throw new Error("Contact list not found");
    }
    
    // Just mark as inactive instead of deleting
    await prisma.contactList.update({
      where: { id: listId },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Contact list soft deleted (deactivated):', listId);
    
    return { softDeleted: true };
  }
  
  /**
   * Check if a list can be safely deleted
   */
  static async canDeleteList(listId) {
    const contactList = await prisma.contactList.findUnique({
      where: { id: listId },
      include: {
        campaigns: {
          where: {
            status: { in: ['active', 'sent'] }
          }
        }
      }
    });
    
    if (!contactList) {
      return { canDelete: false, reason: "List not found" };
    }
    
    if (contactList.campaigns.length > 0) {
      return { 
        canDelete: false, 
        reason: `List is used by ${contactList.campaigns.length} active campaigns`,
        activeCampaigns: contactList.campaigns.map(c => ({ id: c.id, name: c.name, status: c.status }))
      };
    }
    
    return { canDelete: true };
  }
  
  /**
   * Bulk delete multiple lists
   */
  static async bulkDeleteLists(listIds) {
    console.log('🗑️ Bulk deleting contact lists:', listIds);
    
    const results = [];
    
    for (const listId of listIds) {
      try {
        const result = await this.deleteContactList(listId);
        results.push({ listId, success: true, result });
      } catch (error) {
        console.error('❌ Failed to delete list:', listId, error.message);
        results.push({ listId, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`✅ Bulk delete complete: ${successCount} success, ${failCount} failed`);
    
    return {
      total: listIds.length,
      success: successCount,
      failed: failCount,
      results
    };
  }
}

export default ContactListDelete;
