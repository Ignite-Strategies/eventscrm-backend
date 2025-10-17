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
      containerId,
      eventId, 
      audienceType,
      currentStage,
      isOrgMember,
      engagementValue,
      chapterResponsibleFor,
      attended
    } = req.query;

    console.log('🔍 DEBUG: Looking for contacts with orgId:', orgId);

    // DEBUG: Check if ANY contacts exist
    const totalContacts = await prisma.contact.count();
    console.log('🔍 DEBUG: Total contacts in database:', totalContacts);

    // DEBUG: Get ALL contacts to see what's there
    const allContacts = await prisma.contact.findMany({
      take: 5,
      select: { 
        id: true, 
        firstName: true, 
        lastName: true, 
        email: true, 
        containerId: true,
        orgId: true,
        eventId: true
      }
    });
    console.log('🔍 DEBUG: Sample contacts:', allContacts);

    // DEBUG: Check what orgIds exist
    const orgIds = await prisma.contact.findMany({
      select: { orgId: true },
      distinct: ['orgId']
    });
    console.log('🔍 DEBUG: Existing orgIds:', orgIds.map(c => c.orgId));

    // DEBUG: Check what containerIds exist
    const containerIds = await prisma.contact.findMany({
      select: { containerId: true },
      distinct: ['containerId']
    });
    console.log('🔍 DEBUG: Existing containerIds:', containerIds.map(c => c.containerId));

    // Build dynamic where clause
    const where = {};
    
    // Filter by containerId (long-term solution!) or orgId (legacy)
    if (containerId) {
      where.containerId = containerId;
    } else if (orgId) {
      where.orgId = orgId;
    }
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

    // SIMPLE: Just get all contacts directly - no complex joins needed
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
    const { email, containerId, orgId, ...contactData } = req.body;

    console.log('💾 Saving contact:', email, 'containerId:', containerId, 'orgId:', orgId);

    // Everyone lives in a container AND has an org!
    const contact = await prisma.contact.upsert({
      where: { email },
      update: {
        ...contactData,
        containerId: containerId || 'cmgu7w02h0000ceaqt7iz6bf9', // Default F3 CRM container
        orgId: orgId // Org membership
      },
      create: {
        email,
        containerId: containerId || 'cmgu7w02h0000ceaqt7iz6bf9', // Default F3 CRM container
        orgId: orgId, // Org membership
        ...contactData
      }
    });

    console.log(`✅ Contact ${contact.id} saved with containerId: ${contact.containerId}, orgId: ${contact.orgId}`);

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
    console.error('❌ Full error details:', error.message);
    console.error('❌ Error code:', error.code);
    res.status(500).json({ 
      error: 'Failed to update contact',
      details: error.message 
    });
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

// ============================================
// GET /contacts/sql-admin - SQL Admin to query Contact table directly
// ============================================
router.get('/sql-admin', async (req, res) => {
  try {
    console.log('🔍 SQL ADMIN: Querying Contact table directly');

    // Raw SQL to get ALL contacts
    const result = await prisma.$queryRaw`
      SELECT 
        id,
        "firstName",
        "lastName", 
        email,
        "orgId",
        "eventId",
        "currentStage",
        "audienceType",
        "createdAt"
      FROM "Contact" 
      ORDER BY "createdAt" DESC
      LIMIT 20
    `;

    console.log(`🔍 SQL ADMIN: Found ${result.length} contacts`);
    console.log('🔍 SQL ADMIN: First 3 contacts:', result.slice(0, 3));

    // Also get count
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM "Contact"
    `;
    const totalCount = parseInt(countResult[0].total);

    res.json({
      success: true,
      totalCount,
      showing: result.length,
      contacts: result
    });

  } catch (error) {
    console.error('❌ SQL Admin error:', error);
    res.status(500).json({ error: 'Failed to query contacts', details: error.message });
  }
});

export default router;

