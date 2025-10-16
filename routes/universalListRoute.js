import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * 🎯 UNIVERSAL LIST BUILDING
 * Query contacts with filters → create list for campaigns
 */

// GET /lists/preview - Preview contacts before creating list
router.get('/preview', async (req, res) => {
  try {
    const { orgId, eventId, audienceType, currentStage, engagementValue, chapterResponsibleFor } = req.query;

    console.log('👁️ PREVIEW:', { orgId, eventId, audienceType, currentStage, engagementValue, chapterResponsibleFor });

    // Build where clause
    const where = {};
    if (orgId) where.orgId = orgId;
    if (eventId) where.eventId = eventId;
    if (audienceType) where.audienceType = audienceType;
    if (currentStage) where.currentStage = currentStage;
    if (engagementValue) where.engagementValue = parseInt(engagementValue);
    if (chapterResponsibleFor) where.chapterResponsibleFor = chapterResponsibleFor;

    const contacts = await prisma.contact.findMany({ 
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        currentStage: true,
        audienceType: true,
        engagementValue: true
      },
      take: 100 // Preview max 100
    });

    const totalCount = await prisma.contact.count({ where });

    console.log(`✅ Preview: ${totalCount} total, showing ${contacts.length}`);

    res.json({
      success: true,
      contacts,
      totalCount,
      previewCount: contacts.length
    });

  } catch (error) {
    console.error('❌ Preview error:', error);
    res.status(500).json({ error: 'Failed to preview contacts' });
  }
});

// POST /lists/create - Create list from filters
router.post('/create', async (req, res) => {
  try {
    const { 
      name, 
      description,
      orgId,
      filters: { eventId, audienceType, currentStage, engagementValue, chapterResponsibleFor } = {}
    } = req.body;

    console.log('🎯 CREATE LIST:', name, { orgId, eventId, audienceType, currentStage });

    // Build where clause
    const where = { orgId };
    if (eventId) where.eventId = eventId;
    if (audienceType) where.audienceType = audienceType;
    if (currentStage) where.currentStage = currentStage;
    if (engagementValue) where.engagementValue = parseInt(engagementValue);
    if (chapterResponsibleFor) where.chapterResponsibleFor = chapterResponsibleFor;

    // Get contacts
    const contacts = await prisma.contact.findMany({ where });

    console.log(`✅ Found ${contacts.length} contacts`);

    // Create list
    const list = await prisma.contactList.create({
      data: {
        name,
        description: description || `${contacts.length} contacts`,
        orgId,
        type: 'manual',
        totalContacts: contacts.length,
        isActive: true,
        filters: { eventId, audienceType, currentStage, engagementValue, chapterResponsibleFor }
      }
    });

    // Link contacts to list
    await prisma.contact.updateMany({
      where: { id: { in: contacts.map(c => c.id) }},
      data: { contactListId: list.id }
    });

    console.log(`✅ List ${list.id} created with ${contacts.length} contacts`);

    res.json({
      success: true,
      list: {
        id: list.id,
        name: list.name,
        totalContacts: contacts.length
      }
    });

  } catch (error) {
    console.error('❌ Create list error:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

export default router;

