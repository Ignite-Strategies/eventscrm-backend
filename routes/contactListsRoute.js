import express from "express";
import { getPrismaClient } from "../config/database.js";
import ContactListService from "../services/contactListService.js";
import ContactListFormHydrator from "../services/contactListFormHydrator.js";

const router = express.Router();
const prisma = getPrismaClient();

// GET /contact-lists/form-data - Get form hydration data (MUST BE BEFORE /:listId)
router.get("/form-data", async (req, res) => {
  try {
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }
    
    const formData = await ContactListFormHydrator.getFormData(orgId);
    res.json(formData);
  } catch (error) {
    console.error("Error fetching form data:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /contact-lists - Get all contact lists for org
router.get("/", async (req, res) => {
  try {
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }
    
    const contactLists = await prisma.contactList.findMany({
      where: { orgId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(contactLists);
  } catch (error) {
    console.error("Error fetching contact lists:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /contact-lists/:listId - Get specific contact list
router.get("/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    
    const contactList = await prisma.contactList.findUnique({
      where: { id: listId }
    });
    
    if (!contactList) {
      return res.status(404).json({ error: "Contact list not found" });
    }
    
    res.json(contactList);
  } catch (error) {
    console.error("Error fetching contact list:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /contact-lists/:listId/contacts - Get all contacts in a list (THE MAGIC!)
router.get("/:listId/contacts", async (req, res) => {
  try {
    const { listId } = req.params;
    
    const contacts = await ContactListService.getContactsForList(listId);
    res.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts from list:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /contact-lists - Create new contact list
router.post("/", async (req, res) => {
  try {
    const contactList = await ContactListService.createContactList(req.body);
    res.status(201).json(contactList);
  } catch (error) {
    console.error("Error creating contact list:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /contact-lists/:listId - Update contact list
router.patch("/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.orgId;
    delete updates.totalContacts;
    delete updates.lastUpdated;
    delete updates.usageCount;
    delete updates.lastUsed;
    
    const contactList = await prisma.contactList.update({
      where: { id: listId },
      data: updates
    });
    
    if (!contactList) {
      return res.status(404).json({ error: "Contact list not found" });
    }
    
    // Update contact count if needed
    await ContactListService.updateContactCount(contactList);
    
    res.json(contactList);
  } catch (error) {
    console.error("Error updating contact list:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /contact-lists/:listId - Delete contact list with cascade
router.delete("/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    
    // First, remove this list from all campaigns (cascade)
    await prisma.campaign.updateMany({
      where: { contactListId: listId },
      data: { contactListId: null }
    });
    
    // Then, free all contacts from this list (cascade)
    await prisma.contact.updateMany({
      where: { contactListId: listId },
      data: { contactListId: null }
    });
    
    // Finally, delete the contact list
    await prisma.contactList.delete({
      where: { id: listId }
    });
    
    res.json({ 
      message: "Contact list deleted successfully",
      cascaded: {
        campaigns: "Removed from all campaigns",
        contacts: "Freed all contacts"
      }
    });
  } catch (error) {
    console.error("Error deleting contact list:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /contact-lists/:listId/refresh - Refresh dynamic list
router.post("/:listId/refresh", async (req, res) => {
  try {
    const { listId } = req.params;
    
    const result = await ContactListService.refreshDynamicList(listId);
    
    res.json({ 
      message: "List refreshed successfully",
      ...result
    });
  } catch (error) {
    console.error("Error refreshing contact list:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /contact-lists/:listId/stats - Get list statistics
router.get("/:listId/stats", async (req, res) => {
  try {
    const { listId } = req.params;
    
    const stats = await ContactListService.getListStats(listId);
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching list stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /contact-lists/from-event - Create contact list from event attendees
router.post("/from-event", async (req, res) => {
  try {
    const { 
      orgId, 
      name, 
      description, 
      eventId, 
      audienceType, 
      stages 
    } = req.body;
    
    if (!orgId || !name || !eventId) {
      return res.status(400).json({ 
        error: "orgId, name, and eventId are required" 
      });
    }
    
    // Create contact list with event attendee criteria
    const contactList = await ContactListService.createContactList({
      orgId,
      name,
      description: description || `Contacts from event`,
      type: "event_attendee",
      criteria: {
        eventId,
        audienceType,
        stages
      }
    });
    
    res.status(201).json(contactList);
  } catch (error) {
    console.error("Error creating contact list from event:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /contact-lists/from-org-members - Create contact list from org members
router.post("/from-org-members", async (req, res) => {
  try {
    const { orgId, name, description } = req.body;
    
    if (!orgId || !name) {
      return res.status(400).json({ 
        error: "orgId and name are required" 
      });
    }
    
    // Create contact list with org member criteria
    const contactList = await ContactListService.createContactList({
      orgId,
      name,
      description: description || `Org members`,
      type: "org_member"
    });
    
    res.status(201).json(contactList);
  } catch (error) {
    console.error("Error creating org member contact list:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /contact-lists/from-all-contacts - Create contact list from all contacts
router.post("/from-all-contacts", async (req, res) => {
  try {
    const { orgId, name, description } = req.body;
    
    if (!orgId || !name) {
      return res.status(400).json({ 
        error: "orgId and name are required" 
      });
    }
    
    // Create contact list with all contacts
    const contactList = await ContactListService.createContactList({
      orgId,
      name,
      description: description || `All contacts`,
      type: "contact"
    });
    
    res.status(201).json(contactList);
  } catch (error) {
    console.error("Error creating general contact list:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /contact-lists/test - Create a hardcoded test list with Adam's email
router.post("/test", async (req, res) => {
  try {
    const { orgId } = req.body;
    
    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }
    
    // 1. Find or create test contact
    let testContact = await prisma.contact.findFirst({
      where: {
        email: "adam.cole.0524@gmail.com",
        orgMember: { orgId }
      }
    });
    
    if (!testContact) {
      // Create test contact
      const orgMember = await prisma.orgMember.create({
        data: {
          orgId,
          firstName: "Adam",
          lastName: "Cole (Test)",
          email: "adam.cole.0524@gmail.com"
        }
      });
      
      testContact = await prisma.contact.create({
        data: {
          orgMemberId: orgMember.id,
          email: "adam.cole.0524@gmail.com",
          firstName: "Adam",
          lastName: "Cole (Test)"
        }
      });
    }
    
    // 2. Create the test list
    const contactList = await prisma.contactList.create({
      data: {
        orgId,
        name: "🧪 Test List",
        description: "Quick test with Adam",
        type: "selection",
        totalContacts: 1
      }
    });
    
    // 3. Link contact to list
    await prisma.contact.update({
      where: { id: testContact.id },
      data: { contactListId: contactList.id }
    });
    
    console.log(`✅ Created test list with adam.cole.0524@gmail.com`);
    
    res.status(201).json(contactList);
  } catch (error) {
    console.error("Error creating test list:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /contact-lists/from-selection - Create contact list from selected contacts (SIMPLE!)
router.post("/from-selection", async (req, res) => {
  try {
    const { orgId, name, description, selectedContactIds } = req.body;
    
    if (!orgId || !name || !selectedContactIds || !Array.isArray(selectedContactIds)) {
      return res.status(400).json({ 
        error: "orgId, name, and selectedContactIds array are required" 
      });
    }
    
    console.log('🎯 Creating SIMPLE selection list:', { orgId, name, contactCount: selectedContactIds.length });
    console.log('📋 Selected Contact IDs:', selectedContactIds);
    
    // 1. Create the contact list (SIMPLE!)
    const contactList = await ContactListService.createContactList({
      orgId,
      name,
      description: description || "Selected contacts",
      type: "selection"
    });
    
    console.log('📋 List created, now assigning contacts...');
    
    // 2. Assign the selected contacts (SIMPLE!)
    const assignResult = await ContactListService.assignContactsToList(contactList.id, selectedContactIds);
    
    console.log('📋 Assignment result:', assignResult);
    
    console.log(`✅ SIMPLE selection list created: "${name}" with ${selectedContactIds.length} contacts`);
    
    // Return the updated list with count
    const updatedList = await prisma.contactList.findUnique({
      where: { id: contactList.id }
    });
    
    res.status(201).json(updatedList);
  } catch (error) {
    console.error("Error creating selection list:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
