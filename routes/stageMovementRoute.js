import express from "express";
import StageMovementService from "../services/stageMovementService.js";

const router = express.Router();

/**
 * POST /api/stage-movement/auto-move
 * Auto-move contacts after sequence completion
 */
router.post("/auto-move", async (req, res) => {
  try {
    const { sequenceId, contactIds } = req.body;
    
    if (!sequenceId) {
      return res.status(400).json({ error: "sequenceId is required" });
    }
    
    const result = await StageMovementService.moveContactsAfterEmail(
      sequenceId,
      contactIds
    );
    
    res.json({
      success: true,
      message: `Moved ${result.moved} contacts to next stage`,
      ...result
    });
    
  } catch (error) {
    console.error("Error auto-moving contacts:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stage-movement/manual
 * Manually move a single contact to next stage
 */
router.post("/manual", async (req, res) => {
  try {
    const { eventAttendeeId, toStage } = req.body;
    
    if (!eventAttendeeId) {
      return res.status(400).json({ error: "eventAttendeeId is required" });
    }
    
    const result = await StageMovementService.moveContactManually(
      eventAttendeeId,
      toStage
    );
    
    res.json({
      success: true,
      message: `Moved contact from ${result.from} to ${result.to}`,
      ...result
    });
    
  } catch (error) {
    console.error("Error manually moving contact:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stage-movement/bulk
 * Bulk move contacts by stage for an event
 */
router.post("/bulk", async (req, res) => {
  try {
    const { eventId, fromStage, toStage } = req.body;
    
    if (!eventId || !fromStage || !toStage) {
      return res.status(400).json({ 
        error: "eventId, fromStage, and toStage are required" 
      });
    }
    
    const result = await StageMovementService.bulkMoveByStage(
      eventId,
      fromStage,
      toStage
    );
    
    res.json({
      success: true,
      message: `Bulk moved ${result.moved} contacts`,
      ...result
    });
    
  } catch (error) {
    console.error("Error bulk moving contacts:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stage-movement/preview/:sequenceId
 * Preview what would happen if we moved contacts
 */
router.get("/preview/:sequenceId", async (req, res) => {
  try {
    const { sequenceId } = req.params;
    
    const preview = await StageMovementService.previewMovement(sequenceId);
    
    res.json(preview);
    
  } catch (error) {
    console.error("Error previewing movement:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stage-movement/progression-map
 * Get the stage progression map
 */
router.get("/progression-map", async (req, res) => {
  try {
    const map = StageMovementService.getProgressionMap();
    
    res.json({
      progressions: map,
      count: Object.keys(map).length
    });
    
  } catch (error) {
    console.error("Error getting progression map:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

