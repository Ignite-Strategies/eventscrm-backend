import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// Super User Protection - prevent deletion of super user
const SUPER_USER_ORG_ID = 'cmgfvz9v10000nt284k875eoc';

/**
 * DELETE /api/orgmembers/:id
 * 
 * Delete an OrgMember record (does NOT delete the Contact)
 * This is fork-aware - only removes the org membership
 * Includes super user protection
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting OrgMember:', id);

    // Check if OrgMember exists
    const orgMember = await prisma.orgMember.findUnique({
      where: { id },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!orgMember) {
      return res.status(404).json({ error: 'OrgMember not found' });
    }

    // Super User Protection
    if (orgMember.orgId === SUPER_USER_ORG_ID) {
      return res.status(403).json({ 
        error: 'Cannot delete super user OrgMember record',
        message: 'Super user protection enabled'
      });
    }

    // Delete OrgMember (Contact remains untouched)
    await prisma.orgMember.delete({
      where: { id }
    });

    console.log('✅ OrgMember deleted successfully (Contact preserved)');

    res.json({ 
      success: true, 
      message: 'OrgMember deleted successfully',
      deletedOrgMember: {
        id: orgMember.id,
        contactName: `${orgMember.contact.firstName} ${orgMember.contact.lastName}`,
        contactEmail: orgMember.contact.email,
        orgId: orgMember.orgId
      }
    });

  } catch (error) {
    console.error('❌ Error deleting OrgMember:', error);
    res.status(500).json({ error: 'Failed to delete OrgMember' });
  }
});

export default router;
