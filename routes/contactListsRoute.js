import express from "express";
import ContactList from "../models/ContactList.js";
import Supporter from "../models/Supporter.js";
import FamilyProspect from "../models/FamilyProspect.js";
import EventPipeline from "../models/EventPipeline.js";

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
    
    const contactList = await ContactList.findById(listId);
    
    if (!contactList) {
      return res.status(404).json({ error: "Contact list not found" });
    }
    
    let contacts = [];
    
    // Handle different list types
    switch (contactList.type) {
      case "manual":
        // Get manually added contacts
        contacts = await contactList.getContacts();
        break;
        
      case "pipeline":
        // Get contacts from event pipeline registry
        contacts = await getPipelineContacts(contactList);
        break;
        
      case "tag_based":
        // Get contacts based on tag criteria
        contacts = await getTagBasedContacts(contactList);
        break;
        
      case "dynamic":
        // Update and get dynamic list
        contacts = await contactList.updateDynamicList();
        break;
        
      default:
        contacts = await contactList.getContacts();
    }
    
    res.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts from list:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /contact-lists - Create new contact list
router.post("/", async (req, res) => {
  try {
    const { 
      orgId, 
      name, 
      description, 
      type, 
      criteria,
      supporterIds,
      prospectIds,
      createdBy 
    } = req.body;
    
    if (!orgId || !name || !type) {
      return res.status(400).json({ 
        error: "orgId, name, and type are required" 
      });
    }
    
    // Check if list name already exists for this org
    const existingList = await ContactList.findOne({ orgId, name });
    if (existingList) {
      return res.status(400).json({ 
        error: "Contact list name already exists for this organization" 
      });
    }
    
    let contactListData = {
      orgId,
      name,
      description,
      type,
      createdBy: createdBy || "admin"
    };
    
    // Handle different list types
    switch (type) {
      case "manual":
        contactListData.supporterIds = supporterIds || [];
        contactListData.prospectIds = prospectIds || [];
        break;
        
      case "pipeline":
        if (!criteria.eventId || !criteria.audienceType || !criteria.stage) {
          return res.status(400).json({ 
            error: "Pipeline lists require eventId, audienceType, and stage" 
          });
        }
        contactListData.eventId = criteria.eventId;
        contactListData.audienceType = criteria.audienceType;
        contactListData.stages = [criteria.stage];
        break;
        
      case "tag_based":
        if (!criteria.tagName || !criteria.tagValue) {
          return res.status(400).json({ 
            error: "Tag-based lists require tagName and tagValue" 
          });
        }
        contactListData.filters = {
          supporterFilters: {
            tags: [{ name: criteria.tagName, value: criteria.tagValue }]
          }
        };
        break;
        
      case "dynamic":
        if (!criteria.filters) {
          return res.status(400).json({ 
            error: "Dynamic lists require filters criteria" 
          });
        }
        contactListData.filters = criteria.filters;
        break;
    }
    
    const contactList = new ContactList(contactListData);
    await contactList.save();
    
    // Calculate initial contact count
    await updateContactCount(contactList);
    
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
    await updateContactCount(contactList);
    
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
    
    const contactList = await ContactList.findById(listId);
    
    if (!contactList) {
      return res.status(404).json({ error: "Contact list not found" });
    }
    
    if (contactList.type !== "dynamic") {
      return res.status(400).json({ 
        error: "Only dynamic lists can be refreshed" 
      });
    }
    
    const contacts = await contactList.updateDynamicList();
    
    res.json({ 
      message: "List refreshed successfully",
      totalContacts: contacts.length,
      contacts 
    });
  } catch (error) {
    console.error("Error refreshing contact list:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get pipeline contacts (THE REGISTRY MAGIC!)
async function getPipelineContacts(contactList) {
  const { eventId, audienceType, stages } = contactList;
  
  // Get pipeline registry entries
  const pipelineEntries = await EventPipeline.find({
    eventId,
    audienceType,
    stage: { $in: stages }
  });
  
  const contacts = [];
  
  for (const entry of pipelineEntries) {
    if (audienceType === "org_member") {
      // Get supporters
      const supporters = await Supporter.find({
        _id: { $in: entry.supporterIds }
      });
      contacts.push(...supporters.map(s => ({ ...s.toObject(), type: 'supporter' })));
    } else if (audienceType === "family_prospect") {
      // Get family prospects
      const prospects = await FamilyProspect.find({
        _id: { $in: entry.supporterIds }
      });
      contacts.push(...prospects.map(p => ({ ...p.toObject(), type: 'prospect' })));
    }
  }
  
  return contacts;
}

// Helper function to get tag-based contacts
async function getTagBasedContacts(contactList) {
  const { filters } = contactList;
  const contacts = [];
  
  if (filters.supporterFilters?.tags) {
    const supporterQuery = { orgId: contactList.orgId };
    
    for (const tag of filters.supporterFilters.tags) {
      supporterQuery[`tags.${tag.name}`] = tag.value;
    }
    
    const supporters = await Supporter.find(supporterQuery);
    contacts.push(...supporters.map(s => ({ ...s.toObject(), type: 'supporter' })));
  }
  
  if (filters.prospectFilters?.tags) {
    const prospectQuery = { orgId: contactList.orgId };
    
    for (const tag of filters.prospectFilters.tags) {
      prospectQuery[`tags.${tag.name}`] = tag.value;
    }
    
    const prospects = await FamilyProspect.find(prospectQuery);
    contacts.push(...prospects.map(p => ({ ...p.toObject(), type: 'prospect' })));
  }
  
  return contacts;
}

// Helper function to update contact count
async function updateContactCount(contactList) {
  let count = 0;
  
  switch (contactList.type) {
    case "manual":
      count = contactList.supporterIds.length + contactList.prospectIds.length;
      break;
      
    case "pipeline":
      const pipelineContacts = await getPipelineContacts(contactList);
      count = pipelineContacts.length;
      break;
      
    case "tag_based":
      const tagContacts = await getTagBasedContacts(contactList);
      count = tagContacts.length;
      break;
      
    case "dynamic":
      const dynamicContacts = await contactList.updateDynamicList();
      count = dynamicContacts.length;
      break;
  }
  
  contactList.totalContacts = count;
  contactList.lastUpdated = new Date();
  await contactList.save();
  
  return count;
}

export default router;
