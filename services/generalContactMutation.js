import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * Database mutations for General Contacts
 * Pure database operations - no validation, no parsing
 */

/**
 * Create a single Contact
 */
export async function createGeneralContact(orgId, contactData) {
  try {
    const contact = await prisma.contact.create({
      data: {
        ...contactData,
        orgId
      }
    });
    
    return {
      success: true,
      contact: contact
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Bulk upsert contacts (create or update)
 */
export async function bulkUpsertGeneralContacts(orgId, contactsData) {
  try {
    console.log('🔧 GENERAL CONTACT MUTATION: Starting bulk upsert for orgId:', orgId);
    console.log('🔧 GENERAL CONTACT MUTATION: Contacts data count:', contactsData.length);
    
    let created = 0;
    let updated = 0;
    
    for (const contactData of contactsData) {
      try {
        // Use upsert for each Contact
        const where = contactData.email 
          ? { orgId_email: { orgId, email: contactData.email } }
          : undefined;
        
        if (where) {
          const result = await prisma.contact.upsert({
            where,
            update: {
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              phone: contactData.phone
            },
            create: {
              ...contactData,
              orgId
            }
          });
          
          if (result.createdAt.getTime() === result.updatedAt.getTime()) {
            created++;
          } else {
            updated++;
          }
        } else {
          // Create new contact if no email for upsert
          await prisma.contact.create({
            data: {
              ...contactData,
              orgId
            }
          });
          created++;
        }
      } catch (error) {
        console.log('🔧 GENERAL CONTACT MUTATION: Error processing contact:', contactData.email, error.message);
        // Continue with next contact
      }
    }
    
    console.log('🔧 GENERAL CONTACT MUTATION: Completed:', { created, updated });
    
    return {
      success: true,
      inserted: created,
      updated: updated
    };
  } catch (error) {
    console.error('🔧 GENERAL CONTACT MUTATION ERROR:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get contacts by org
 */
export async function getGeneralContactsByOrg(orgId) {
  try {
    console.log('🔍 GENERAL CONTACT MUTATION: Fetching contacts for orgId:', orgId);
    
    const contacts = await prisma.contact.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('🔍 GENERAL CONTACT MUTATION: Found', contacts.length, 'contacts');
    
    return {
      success: true,
      contacts
    };
  } catch (error) {
    console.error('🔍 GENERAL CONTACT MUTATION ERROR:', error);
    return {
      success: false,
      error: error.message,
      contacts: []
    };
  }
}

/**
 * Delete a single contact
 */
export async function deleteGeneralContact(contactId) {
  try {
    await prisma.contact.delete({
      where: { id: contactId }
    });
    
    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
