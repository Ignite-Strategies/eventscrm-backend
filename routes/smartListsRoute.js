import express from "express";
import { getPrismaClient } from "../config/database.js";
import SmartListService from "../services/smartListService.js";

const router = express.Router();
const prisma = getPrismaClient();

/**
 * POST /smart-lists/event/:eventId
 * Create all smart lists for a specific event
 */
router.post("/event/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    const lists = await SmartListService.createSmartListsForEvent(event, event.orgId);
    
    res.json({
      message: `Created ${lists.length} smart lists for ${event.name}`,
      lists
    });
  } catch (error) {
    console.error("Error creating event smart lists:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /smart-lists/org/:orgId
 * Create all org-wide smart lists
 */
router.post("/org/:orgId", async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const lists = await SmartListService.createOrgSmartLists(orgId);
    
    res.json({
      message: `Created ${lists.length} org-wide smart lists`,
      lists
    });
  } catch (error) {
    console.error("Error creating org smart lists:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /smart-lists/latest-event/:orgId
 * Create smart lists for the latest event
 */
router.post("/latest-event/:orgId", async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const lists = await SmartListService.createSmartListsForLatestEvent(orgId);
    
    res.json({
      message: `Created smart lists for latest event`,
      lists
    });
  } catch (error) {
    console.error("Error creating latest event smart lists:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /smart-lists/refresh/event/:eventId
 * Refresh all smart lists for an event
 */
router.post("/refresh/event/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const count = await SmartListService.refreshEventSmartLists(eventId);
    
    res.json({
      message: `Refreshed ${count} smart lists`,
      count
    });
  } catch (error) {
    console.error("Error refreshing event smart lists:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /smart-lists/refresh/org/:orgId
 * Refresh all org-wide smart lists
 */
router.post("/refresh/org/:orgId", async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const count = await SmartListService.refreshOrgSmartLists(orgId);
    
    res.json({
      message: `Refreshed ${count} org-wide smart lists`,
      count
    });
  } catch (error) {
    console.error("Error refreshing org smart lists:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /smart-lists/templates
 * Get all available smart list templates
 */
router.get("/templates", async (req, res) => {
  try {
    const templates = Object.keys(SmartListService.SMART_LIST_TEMPLATES).map(key => ({
      key,
      template: SmartListService.SMART_LIST_TEMPLATES[key]
    }));
    
    res.json(templates);
  } catch (error) {
    console.error("Error fetching smart list templates:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

