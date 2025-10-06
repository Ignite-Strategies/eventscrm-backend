import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * Database mutations for supporters
 * Pure database operations - no validation, no parsing
 */

/**
 * Create a single supporter
 */
export async function createSupporter(orgId, supporterData) {
  try {
    const supporter = await prisma.supporter.create({
      data: {
        ...supporterData,
        orgId
      }
    });
    
    return {
      success: true,
      supporter
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Bulk upsert supporters (create or update)
 */
export async function bulkUpsertSupporters(orgId, supportersData) {
  try {
    console.log('🔧 MUTATION: Starting bulk upsert for orgId:', orgId);
    console.log('🔧 MUTATION: Supporters data count:', supportersData.length);
    
    let created = 0;
    let updated = 0;
    
    for (const supporterData of supportersData) {
      try {
        // Use upsert for each supporter
        const where = supporterData.email 
          ? { orgId_email: { orgId, email: supporterData.email } }
          : undefined;
        
        if (where) {
          // Has email - can upsert
          const result = await prisma.supporter.upsert({
            where,
            update: supporterData,
            create: {
              ...supporterData,
              orgId
            }
          });
          
          // Check if created or updated (Prisma doesn't tell us directly)
          created++;
        } else {
          // No email - just create
          await prisma.supporter.create({
            data: {
              ...supporterData,
              orgId
            }
          });
          created++;
        }
      } catch (err) {
        console.error('Error upserting supporter:', err);
        // Continue with next supporter
      }
    }
    
    console.log('🔧 MUTATION: Bulk upsert complete - created/updated:', created);
    
    return {
      success: true,
      inserted: created,
      updated: updated,
      total: created + updated
    };
  } catch (error) {
    console.error('🔧 MUTATION ERROR:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a supporter
 */
export async function deleteSupporter(supporterId) {
  try {
    const supporter = await prisma.supporter.delete({
      where: { id: supporterId }
    });
    
    return {
      success: true,
      deletedSupporter: supporter
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get supporters by organization
 */
export async function getSupportersByOrg(orgId) {
  try {
    console.log('🔍 GET: Querying supporters for orgId:', orgId);
    
    const supporters = await prisma.supporter.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('🔍 GET: Found', supporters.length, 'supporters');
    
    return {
      success: true,
      supporters
    };
  } catch (error) {
    console.error('🔍 GET ERROR:', error);
    return {
      success: false,
      error: error.message,
      supporters: []
    };
  }
}
