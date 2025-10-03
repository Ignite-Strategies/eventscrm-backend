import express from 'express';
import EventPipeline from '../models/EventPipeline.js';
import { applyPaid } from '../services/pipelineService.js';
import { graduateToAttendee, pushSupportersToEvent, pushAllSupportersToEvent } from '../services/eventPipelineService.js';

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

// Push supporters into event pipeline
router.post('/:eventId/pipeline/push', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { orgId, supporterIds, audienceType = "org_member", stage = "member", source = "admin_add" } = req.body;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    if (!supporterIds || supporterIds.length === 0) {
      return res.status(400).json({ error: 'supporterIds is required' });
    }
    
    const result = await pushSupportersToEvent({
      orgId,
      eventId,
      supporterIds,
      audienceType,
      stage,
      source
    });
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Push ALL supporters into event pipeline
router.post('/:eventId/pipeline/push-all', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { orgId, audienceType = "org_member", stage = "member", source = "bulk_import" } = req.body;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    const result = await pushAllSupportersToEvent({
      orgId,
      eventId,
      audienceType,
      stage,
      source
    });
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create pipeline collections for selected audience types
router.post('/:eventId/pipelines/create', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { orgId, audienceTypes } = req.body;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    if (!audienceTypes || audienceTypes.length === 0) {
      return res.status(400).json({ error: 'audienceTypes is required' });
    }
    
    console.log(`🚀 Creating pipelines for event ${eventId} with audience types:`, audienceTypes);
    
    // For MVP1, we're just setting up the pipeline structure
    // The actual EventPipeline records will be created when supporters are pushed
    const result = {
      success: true,
      eventId,
      audienceTypes,
      message: `Pipeline structure created for ${audienceTypes.length} audience type(s)`,
      pipelines: audienceTypes.map(type => ({
        audienceType: type,
        stages: ['member', 'soft_commit', 'paid'],
        status: 'ready'
      }))
    };
    
    res.json(result);
  } catch (error) {
    console.error('Pipeline creation error:', error);
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

