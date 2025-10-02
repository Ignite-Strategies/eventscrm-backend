import express from 'express';
import EventPipeline from '../models/EventPipeline.js';
import { applyPaid } from '../services/pipelineService.js';
import { graduateToAttendee } from '../services/eventPipelineService.js';

const router = express.Router();

// Get all pipeline records for an event
router.get('/:eventId/pipeline', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { audienceType, stage } = req.query;
    
    const query = { eventId };
    if (audienceType) query.audienceType = audienceType;
    if (stage) query.stage = stage;
    
    const pipelineRecords = await EventPipeline.find(query)
      .populate('supporterId')
      .sort({ createdAt: -1 });
    
    res.json(pipelineRecords);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update pipeline record (move stage)
router.patch('/pipeline/:pipelineId', async (req, res) => {
  try {
    const { stage, rsvp, tags } = req.body;
    const updateData = {};
    
    if (stage) {
      updateData.stage = stage;
      
      // If moving to soft_commit, set rsvp
      if (stage === 'soft_commit') {
        updateData.rsvp = true;
        updateData.rsvpDate = new Date();
      }
    }
    
    if (rsvp !== undefined) updateData.rsvp = rsvp;
    if (tags) updateData.tags = tags;
    
    let pipelineRecord = await EventPipeline.findByIdAndUpdate(
      req.params.pipelineId,
      updateData,
      { new: true }
    );
    
    if (!pipelineRecord) {
      return res.status(404).json({ error: 'Pipeline record not found' });
    }
    
    // If they just moved to paid, graduate them to final attendee
    if (pipelineRecord.paid && pipelineRecord.stage === 'paid') {
      const attendee = await graduateToAttendee(pipelineRecord._id);
      return res.json({ 
        pipelineRecord, 
        attendee,
        graduated: true 
      });
    }
    
    res.json(pipelineRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

