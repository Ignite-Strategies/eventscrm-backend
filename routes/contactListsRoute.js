import express from "express";
import ContactList from "../models/ContactList.js";
import ContactListService from "../services/contactListService.js";

const router = express.Router();

// GET /contact-lists - Get all contact lists for org
router.get("/", async (req, res) => {
  try {
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }
    
    const contactLists = await ContactList.find({ orgId, isActive: true })
      .sort({ createdAt: -1 });
    
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
    
    const contactList = await ContactList.findById(listId);
    
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
    
    const contactList = await ContactList.findByIdAndUpdate(
      listId,
      updates,
      { new: true, runValidators: true }
    );
    
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
    
    const contactList = await ContactList.findByIdAndUpdate(
      listId,
      { isActive: false },
      { new: true }
    );
    
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


export default router;
