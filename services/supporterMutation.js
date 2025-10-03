import Supporter from '../models/Supporter.js';

/**
 * Database mutations for supporters
 * Pure database operations - no validation, no parsing
 */

/**
 * Create a single supporter
 */
export async function createSupporter(orgId, supporterData) {
  try {
    const supporter = new Supporter({
      ...supporterData,
      orgId
    });
    
    const savedSupporter = await supporter.save();
    return {
      success: true,
      supporter: savedSupporter
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
    console.log('🔧 MUTATION: First supporter sample:', supportersData[0]);
    
    const operations = supportersData.map(supporter => ({
      updateOne: {
        filter: { orgId, email: supporter.email },
        update: { ...supporter, orgId },
        upsert: true
      }
    }));
    
    console.log('🔧 MUTATION: Operations count:', operations.length);
    console.log('🔧 MUTATION: First operation sample:', operations[0]);
    
    const result = await Supporter.bulkWrite(operations);
    
    console.log('🔧 MUTATION: BulkWrite result:', {
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
    
    return {
      success: true,
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      total: supportersData.length
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
    const supporter = await Supporter.findByIdAndDelete(supporterId);
    
    if (!supporter) {
      return {
        success: false,
        error: 'Supporter not found'
      };
    }
    
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
    
    const supporters = await Supporter.find({ orgId }).sort({ createdAt: -1 });
    
    console.log('🔍 GET: Found', supporters.length, 'supporters');
    console.log('🔍 GET: Sample supporter:', supporters[0]);
    
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
