import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * 🔥 UNIFIED CONTACT API
 * 
 * Everything is Contact. No more OrgMember, no more EventAttendee.
 * Just contactId and simple queries.
 */

// ============================================
// GET /contacts - Query contacts with filters
// ============================================
router.get('/', async (req, res) => {
  try {
    const { 
      orgId, 
      eventId, 
      audienceType,
      currentStage,
      isOrgMember,
      engagementValue,
      chapterResponsibleFor,
      attended
    } = req.query;

    // Build dynamic where clause
    const where = {};
    
    if (orgId) where.orgId = orgId;
    if (eventId) where.eventId = eventId;
    if (audienceType) where.audienceType = audienceType;
    if (currentStage) where.currentStage = currentStage;
    if (chapterResponsibleFor) where.chapterResponsibleFor = chapterResponsibleFor;
    
    if (isOrgMember !== undefined) {
      where.isOrgMember = isOrgMember === 'true';
    }
    
    if (engagementValue) {
      where.engagementValue = parseInt(engagementValue);
    }
    
    if (attended !== undefined) {
      where.attended = attended === 'true';
    }

    console.log('📋 UNIFIED CONTACTS QUERY:', where);

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Found ${contacts.length} contacts`);

    res.json({
      success: true,
      count: contacts.length,
      contacts
    });

  } catch (error) {
    console.error('❌ Error querying contacts:', error);
    res.status(500).json({ error: 'Failed to query contacts' });
  }
});

// ============================================
// GET /contacts/:contactId - Get single contact
// ============================================
router.get('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;

    console.log('👤 Fetching contact:', contactId);

    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    console.log('✅ Contact found');

    res.json({
      success: true,
      contact
    });

  } catch (error) {
    console.error('❌ Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// ============================================
// POST /contacts - Create or update contact
// ============================================
router.post('/', async (req, res) => {
  try {
    const { email, ...contactData } = req.body;

    console.log('💾 Saving contact:', email);

    const contact = await prisma.contact.upsert({
      where: { email },
      update: contactData,
      create: {
        email,
        ...contactData
      }
    });

    console.log(`✅ Contact ${contact.id} saved`);

    res.json({
      success: true,
      contact
    });

  } catch (error) {
    console.error('❌ Error saving contact:', error);
    res.status(500).json({ error: 'Failed to save contact' });
  }
});

// ============================================
// PATCH /contacts/:contactId - Update contact
// ============================================
router.patch('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const updates = req.body;

    console.log('📝 Updating contact:', contactId, updates);

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: updates
    });

    console.log('✅ Contact updated');

    res.json({
      success: true,
      contact
    });

  } catch (error) {
    console.error('❌ Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// ============================================
// DELETE /contacts/:contactId - Delete contact
// ============================================
router.delete('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;

    console.log('🗑️  Deleting contact:', contactId);

    await prisma.contact.delete({
      where: { id: contactId }
    });

    console.log('✅ Contact deleted');

    res.json({
      success: true,
      message: 'Contact deleted'
    });

  } catch (error) {
    console.error('❌ Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// ============================================
// POST /contacts/bulk-update - Bulk update contacts
// ============================================
router.post('/bulk-update', async (req, res) => {
  try {
    const { contactIds, updates } = req.body;

    console.log(`📝 Bulk updating ${contactIds.length} contacts`);

    await prisma.contact.updateMany({
      where: {
        id: { in: contactIds }
      },
      data: updates
    });

    console.log('✅ Bulk update complete');

    res.json({
      success: true,
      updated: contactIds.length
    });

  } catch (error) {
    console.error('❌ Error bulk updating contacts:', error);
    res.status(500).json({ error: 'Failed to bulk update contacts' });
  }
});

// ============================================
// POST /contacts/move-stage - Move contacts to new stage
// ============================================
router.post('/move-stage', async (req, res) => {
  try {
    const { eventId, fromStage, toStage } = req.body;

    console.log(`🚀 Moving contacts: ${eventId} from ${fromStage} → ${toStage}`);

    const result = await prisma.contact.updateMany({
      where: {
        eventId,
        currentStage: fromStage
      },
      data: {
        currentStage: toStage
      }
    });

    console.log(`✅ Moved ${result.count} contacts`);

    res.json({
      success: true,
      moved: result.count
    });

  } catch (error) {
    console.error('❌ Error moving contacts:', error);
    res.status(500).json({ error: 'Failed to move contacts' });
  }
});

export default router;

