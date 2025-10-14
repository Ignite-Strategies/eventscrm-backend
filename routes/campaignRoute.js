import express from "express";
import { getPrismaClient } from "../config/database.js";

const router = express.Router();
const prisma = getPrismaClient();

// GET /campaigns - Get all campaigns for org
router.get("/", async (req, res) => {
  try {
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }
    
    const campaigns = await prisma.campaign.findMany({
      where: { orgId },
      include: {
        contactList: {
          select: {
            id: true,
            name: true,
            totalContacts: true
          }
        },
        sequences: {
          select: {
            id: true,
            name: true,
            status: true,
            order: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /campaigns/:campaignId - Get specific campaign
router.get("/:campaignId", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        contactList: true,
        sequences: {
          orderBy: { order: 'asc' }
        }
      }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /campaigns - Create new campaign
router.post("/", async (req, res) => {
  try {
    const { orgId, name, description, contactListId } = req.body;
    
    if (!orgId || !name) {
      return res.status(400).json({ error: "orgId and name are required" });
    }
    
    // Allow duplicate campaign names - they're just labels
    
    const campaign = await prisma.campaign.create({
      data: {
        orgId,
        name,
        description,
        contactListId,
        status: "draft"
      },
      include: {
        contactList: true
      }
    });
    
    res.status(201).json(campaign);
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /campaigns/:campaignId - Update campaign
router.patch("/:campaignId", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.orgId;
    delete updates.createdAt;
    
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: updates,
      include: {
        contactList: true,
        sequences: true
      }
    });
    
    res.json(campaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /campaigns/:campaignId - Delete campaign
router.delete("/:campaignId", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    await prisma.campaign.delete({
      where: { id: campaignId }
    });
    
    res.json({ message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

