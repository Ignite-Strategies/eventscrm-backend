import express from "express";
import { getPrismaClient } from "../config/database.js";
import ContactListOrchestrator from "../services/contactListOrchestrator.js";

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

// NOTE: Sequence SENDING has been moved to /api/enterprise-email/send-sequence
// This route is now purely for sequence CONFIGURATION (CRUD operations)

export default router;

