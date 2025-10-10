import express from "express";
import { getPrismaClient } from "../config/database.js";
import ContactListService from "../services/contactListService.js";

const router = express.Router();
const prisma = getPrismaClient();

// GET /sequences - Get all sequences for a campaign
router.get("/", async (req, res) => {
  try {
    const { campaignId } = req.query;
    
    if (!campaignId) {
      return res.status(400).json({ error: "campaignId is required" });
    }
    
    const sequences = await prisma.sequence.findMany({
      where: { campaignId },
      include: {
        template: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });
    
    res.json(sequences);
  } catch (error) {
    console.error("Error fetching sequences:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /sequences/:sequenceId - Get specific sequence
router.get("/:sequenceId", async (req, res) => {
  try {
    const { sequenceId } = req.params;
    
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId },
      include: {
        campaign: {
          include: {
            contactList: true
          }
        },
        template: true
      }
    });
    
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    
    res.json(sequence);
  } catch (error) {
    console.error("Error fetching sequence:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /sequences - Create new sequence in a campaign
router.post("/", async (req, res) => {
  try {
    const { 
      campaignId, 
      name, 
      subject, 
      html, 
      templateId, 
      delayDays, 
      order 
    } = req.body;
    
    if (!campaignId || !name || !subject || !html) {
      return res.status(400).json({ 
        error: "campaignId, name, subject, and html are required" 
      });
    }
    
    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    // Get next order number if not provided
    let sequenceOrder = order;
    if (!sequenceOrder) {
      const lastSequence = await prisma.sequence.findFirst({
        where: { campaignId },
        orderBy: { order: 'desc' }
      });
      sequenceOrder = lastSequence ? lastSequence.order + 1 : 1;
    }
    
    const sequence = await prisma.sequence.create({
      data: {
        campaignId,
        name,
        subject,
        html,
        templateId,
        delayDays: delayDays || 0,
        order: sequenceOrder,
        status: "draft"
      },
      include: {
        template: true
      }
    });
    
    res.status(201).json(sequence);
  } catch (error) {
    console.error("Error creating sequence:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /sequences/:sequenceId - Update sequence
router.patch("/:sequenceId", async (req, res) => {
  try {
    const { sequenceId } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.campaignId;
    delete updates.createdAt;
    
    const sequence = await prisma.sequence.update({
      where: { id: sequenceId },
      data: updates,
      include: {
        template: true
      }
    });
    
    res.json(sequence);
  } catch (error) {
    console.error("Error updating sequence:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /sequences/:sequenceId - Delete sequence
router.delete("/:sequenceId", async (req, res) => {
  try {
    const { sequenceId } = req.params;
    
    await prisma.sequence.delete({
      where: { id: sequenceId }
    });
    
    res.json({ message: "Sequence deleted successfully" });
  } catch (error) {
    console.error("Error deleting sequence:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /sequences/:sequenceId/send - Send sequence to contacts
router.post("/:sequenceId/send", async (req, res) => {
  try {
    const { sequenceId } = req.params;
    
    // Get sequence with campaign and contact list
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId },
      include: {
        campaign: {
          include: {
            contactList: true
          }
        }
      }
    });
    
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    
    if (!sequence.campaign.contactListId) {
      return res.status(400).json({ error: "Campaign must have a contact list" });
    }
    
    // Get all contacts from the list
    const contacts = await ContactListService.getContactsForList(
      sequence.campaign.contactListId
    );
    
    // Filter out contacts who already responded in previous sequences
    const eligibleContactIds = contacts.map(c => c.id);
    
    if (sequence.order > 1) {
      // Check for responses in previous sequences
      const respondedContacts = await prisma.sequenceContact.findMany({
        where: {
          contactId: { in: eligibleContactIds },
          sequence: {
            campaignId: sequence.campaignId,
            order: { lt: sequence.order }
          },
          status: { in: ["responded", "registered"] }
        },
        select: { contactId: true }
      });
      
      const respondedIds = new Set(respondedContacts.map(sc => sc.contactId));
      const filteredContacts = contacts.filter(c => !respondedIds.has(c.id));
      
      console.log(`✅ Filtered ${respondedIds.size} responded contacts from sequence ${sequence.order}`);
      
      // Create SequenceContact records for eligible contacts
      const sequenceContacts = filteredContacts.map(contact => ({
        sequenceId: sequence.id,
        contactId: contact.id,
        status: "pending"
      }));
      
      await prisma.sequenceContact.createMany({
        data: sequenceContacts,
        skipDuplicates: true
      });
      
      res.json({
        message: "Sequence queued for sending",
        totalContacts: filteredContacts.length,
        skippedResponded: respondedIds.size
      });
    } else {
      // First sequence - send to everyone
      const sequenceContacts = contacts.map(contact => ({
        sequenceId: sequence.id,
        contactId: contact.id,
        status: "pending"
      }));
      
      await prisma.sequenceContact.createMany({
        data: sequenceContacts,
        skipDuplicates: true
      });
      
      res.json({
        message: "Sequence queued for sending",
        totalContacts: contacts.length
      });
    }
    
    // Update sequence status
    await prisma.sequence.update({
      where: { id: sequenceId },
      data: { status: "sending" }
    });
    
  } catch (error) {
    console.error("Error sending sequence:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

