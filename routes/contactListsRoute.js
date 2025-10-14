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

// DELETE /contact-lists/:listId - Soft delete contact list
router.delete("/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    
    const contactList = await prisma.contactList.update({
      where: { id: listId },
      data: { isActive: false }
    });
    
    if (!contactList) {
      return res.status(404).json({ error: "Contact list not found" });
    }
    
    res.json({ message: "Contact list deleted successfully" });
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

// POST /contact-lists/from-selection - Create contact list from selected contacts
router.post("/from-selection", async (req, res) => {
  try {
    const { orgId, name, description, selectedContactIds } = req.body;
    
    if (!orgId || !name || !selectedContactIds || !Array.isArray(selectedContactIds)) {
      return res.status(400).json({ 
        error: "orgId, name, and selectedContactIds array are required" 
      });
    }
    
    // 1. Create the contact list
    const contactList = await prisma.contactList.create({
      data: {
        orgId,
        name,
        description: description || "Selected contacts",
        type: "selection"
      }
    });
    
    // 2. Clear ALL org members first (handle deselection)
    await prisma.contact.updateMany({
      where: {
        orgMember: { orgId }
      },
      data: { contactListId: null }
    });
    
    // 3. Set contactListId ONLY on selected contacts
    await prisma.contact.updateMany({
      where: { id: { in: selectedContactIds } },
      data: { contactListId: contactList.id }
    });
    
    // 4. Update contact count
    await prisma.contactList.update({
      where: { id: contactList.id },
      data: { totalContacts: selectedContactIds.length }
    });
    
    console.log(`✅ Created selection list "${name}" with ${selectedContactIds.length} contacts`);
    
    res.status(201).json(contactList);
  } catch (error) {
    console.error("Error creating selection list:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
