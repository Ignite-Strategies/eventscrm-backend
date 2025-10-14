import express from "express";
import { getPrismaClient } from "../config/database.js";
import ContactListService from "../services/contactListService.js";

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
    
    // GUARDRAILS for contactListId assignment/unassignment
    if ('contactListId' in updates) {
      // Fetch current campaign
      const currentCampaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
      });
      
      if (!currentCampaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // GUARDRAIL 1: Can't reassign if campaign already sent (unless force=true)
      if (currentCampaign.status === 'sent' && req.query.force !== 'true') {
        return res.status(400).json({ 
          error: "Cannot change contact list - campaign already sent",
          options: {
            wiper: "Use Wiper Service to clear and reuse",
            delete: `DELETE /campaigns/${campaignId} to start fresh`,
            force: `PATCH /campaigns/${campaignId}?force=true to override (risky!)`
          }
        });
      }
      
      // GUARDRAIL 2: If assigning a list (not null), validate it exists and belongs to org
      if (updates.contactListId !== null) {
        const list = await prisma.contactList.findUnique({
          where: { id: updates.contactListId }
        });
        
        if (!list) {
          return res.status(404).json({ error: "Contact list not found" });
        }
        
        if (list.orgId !== currentCampaign.orgId) {
          return res.status(403).json({ error: "Contact list belongs to different organization" });
        }
        
        // GUARDRAIL 3: Warn if list already used (but allow it - user's choice)
        const existingCampaigns = await prisma.campaign.findMany({
          where: { 
            contactListId: updates.contactListId,
            status: { in: ['draft', 'active', 'sent'] },
            id: { not: campaignId }  // Exclude current campaign
          }
        });
        
        if (existingCampaigns.length > 0) {
          console.warn(`⚠️ Contact list ${updates.contactListId} is used by ${existingCampaigns.length} other campaign(s)`);
          // Allow but log the warning
        }
      }
    }
    
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

// DELETE /campaigns/:campaignId - Delete campaign ONLY (leaves ContactList intact!)
// WHY? Smart lists are reusable modular assets - don't auto-delete them!
router.delete("/:campaignId", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Fetch campaign details before deleting (for logging/confirmation)
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        contactList: { select: { id: true, name: true } },
        sequences: { select: { id: true } }
      }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    // DELETE campaign only - ContactList remains for reuse!
    await prisma.campaign.delete({
      where: { id: campaignId }
    });
    
    console.log(`🗑️ DELETED Campaign: "${campaign.name}" (status: ${campaign.status})`);
    if (campaign.contactList) {
      console.log(`📋 ContactList "${campaign.contactList.name}" preserved for reuse`);
    }
    
    res.json({ 
      message: "Campaign deleted successfully",
      note: "ContactList preserved - it's a reusable asset!",
      deleted: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status
      },
      preserved: campaign.contactList ? {
        listId: campaign.contactList.id,
        listName: campaign.contactList.name,
        reason: "Smart lists are modular - can be reused for future campaigns"
      } : null
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /campaigns/:id/contacts - Get contacts for a campaign's contact list
router.get("/:id/contacts", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the campaign to find its contactListId
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        contactList: true
      }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    if (!campaign.contactListId) {
      return res.json([]); // No contact list assigned
    }
    
    // Get contacts from the contact list (SIMPLE!)
    const contacts = await ContactListService.getContactsForList(campaign.contactListId);

    res.json(contacts);
  } catch (error) {
    console.error("Error fetching campaign contacts:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

