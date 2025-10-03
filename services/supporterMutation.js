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
    const operations = supportersData.map(supporter => ({
      updateOne: {
        filter: { orgId, email: supporter.email },
        update: { ...supporter, orgId },
        upsert: true
      }
    }));
    
    const result = await Supporter.bulkWrite(operations);
    
    return {
      success: true,
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      total: supportersData.length
    };
  } catch (error) {
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
    const supporters = await Supporter.find({ orgId }).sort({ createdAt: -1 });
    
    return {
      success: true,
      supporters
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      supporters: []
    };
  }
}
