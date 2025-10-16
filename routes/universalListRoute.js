import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * 🎯 UNIVERSAL LIST BUILDING
 * Build lists from Contact queries (orgId, eventId, pipelineId, etc.)
 */

// POST /lists/create-from-query
router.post('/create-from-query', async (req, res) => {
  try {
    const { 
      name, 
      description,
      orgId,
      // Query filters (build list from any combo!)
      queryFilters: {
        orgId: filterOrgId,
        eventId,
        pipelineId,
        audienceType,
        currentStage,
        isOrgMember,
        engagementValue,
        chapterResponsibleFor,
        tags
      } = {}
    } = req.body;

    console.log('🎯 CREATING UNIVERSAL LIST:', name);
    console.log('📋 Filters:', req.body.queryFilters);

    // Build where clause from filters
    const where = {};
    if (filterOrgId) where.orgId = filterOrgId;
    if (eventId) where.eventId = eventId;
    if (pipelineId) where.pipelineId = pipelineId;
    if (audienceType) where.audienceType = audienceType;
    if (currentStage) where.currentStage = currentStage;
    if (chapterResponsibleFor) where.chapterResponsibleFor = chapterResponsibleFor;
    if (isOrgMember !== undefined) where.isOrgMember = isOrgMember;
    if (engagementValue) where.engagementValue = parseInt(engagementValue);
    if (tags?.length > 0) where.orgTags = { hasSome: tags };

    // Get contacts matching query
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
        filters: req.body.queryFilters // Store filters for refresh
      }
    });

    // Link contacts to list
    await prisma.contact.updateMany({
      where: { id: { in: contacts.map(c => c.id) }},
      data: { contactListId: list.id }
    });

    console.log(`✅ Created list ${list.id} with ${contacts.length} contacts`);

    res.json({
      success: true,
      list: {
        ...list,
        contactCount: contacts.length
      }
    });

  } catch (error) {
    console.error('❌ Error creating list:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// POST /lists/:listId/refresh
router.post('/:listId/refresh', async (req, res) => {
  try {
    const { listId } = req.params;

    const list = await prisma.contactList.findUnique({
      where: { id: listId }
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Re-run the stored query
    const where = {};
    const filters = list.filters || {};
    
    if (filters.orgId) where.orgId = filters.orgId;
    if (filters.eventId) where.eventId = filters.eventId;
    if (filters.pipelineId) where.pipelineId = filters.pipelineId;
    if (filters.audienceType) where.audienceType = filters.audienceType;
    if (filters.currentStage) where.currentStage = filters.currentStage;

    const contacts = await prisma.contact.findMany({ where });

    // Update list
    await prisma.contactList.update({
      where: { id: listId },
      data: {
        totalContacts: contacts.length,
        lastUpdated: new Date()
      }
    });

    // Relink contacts
    await prisma.contact.updateMany({
      where: { contactListId: listId },
      data: { contactListId: null }
    });

    await prisma.contact.updateMany({
      where: { id: { in: contacts.map(c => c.id) }},
      data: { contactListId: listId }
    });

    res.json({
      success: true,
      contactCount: contacts.length
    });

  } catch (error) {
    console.error('❌ Error refreshing list:', error);
    res.status(500).json({ error: 'Failed to refresh list' });
  }
});

export default router;

