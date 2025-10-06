import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * Database mutations for OrgMembers (master contact list)
 * Pure database operations - no validation, no parsing
 */

/**
 * Create a single OrgMember
 */
export async function createSupporter(orgId, supporterData) {
  try {
    const orgMember = await prisma.orgMember.create({
      data: {
        ...supporterData,
        orgId
      }
    });
    
    return {
      success: true,
      supporter: orgMember // Keep 'supporter' key for backward compat
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
    console.log('🔧 MUTATION: OrgMembers data count:', supportersData.length);
    
    let created = 0;
    let updated = 0;
    
    for (const supporterData of supportersData) {
      try {
        // Use upsert for each OrgMember
        const where = supporterData.email 
          ? { orgId_email: { orgId, email: supporterData.email } }
          : undefined;
        
        if (where) {
          // Has email - can upsert
          const result = await prisma.orgMember.upsert({
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
          await prisma.orgMember.create({
            data: {
              ...supporterData,
              orgId
            }
          });
          created++;
        }
      } catch (err) {
        console.error('Error upserting OrgMember:', err);
        // Continue with next
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
 * Delete an OrgMember
 */
export async function deleteSupporter(supporterId) {
  try {
    const orgMember = await prisma.orgMember.delete({
      where: { id: supporterId }
    });
    
    return {
      success: true,
      deletedSupporter: orgMember
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get OrgMembers by organization
 */
export async function getSupportersByOrg(orgId) {
  try {
    console.log('🔍 GET: Querying OrgMembers for orgId:', orgId);
    
    const orgMembers = await prisma.orgMember.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('🔍 GET: Found', orgMembers.length, 'OrgMembers');
    
    return {
      success: true,
      supporters: orgMembers // Keep 'supporters' key for backward compat
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
