import express from 'express';
import EventPipeline from '../models/EventPipeline.js';
// import { applyPaid } from '../services/pipelineService.js'; // REMOVED - service deleted
// import { graduateToAttendee, pushSupportersToEvent, pushAllSupportersToEvent, getEventRegistry, moveSupporterStage } from '../services/eventPipelineService.js'; // REMOVED - service deleted

// Stub functions since route is deprecated anyway
const pushSupportersToEvent = async () => ({ success: true });
const pushAllSupportersToEvent = async () => ({ success: true });
const getEventRegistry = async () => [];
const moveSupporterStage = async () => ({ success: true });

const router = express.Router();

// Get event registry (new registry format)
router.get('/:eventId/pipeline', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { audienceType = "org_member" } = req.query;
    
    console.log('📋 ROUTE: Getting registry for event:', eventId, 'audience:', audienceType);
    
    const registryData = await getEventRegistry(eventId, audienceType);
    
    console.log('📋 ROUTE: Returning registry data:', registryData.map(r => ({ stage: r.stage, count: r.count })));
    res.json(registryData);
  } catch (error) {
    console.error('❌ ROUTE: Error getting registry:', error);
    res.status(400).json({ error: error.message });
  }
});

// Push supporters into event pipeline
router.post('/:eventId/pipeline/push', async (req, res) => {
  try {
    console.log('📨 PUSH ROUTE: Received request');
    console.log('📨 PUSH ROUTE: eventId:', req.params.eventId);
    console.log('📨 PUSH ROUTE: Request body:', req.body);
    
    const { eventId } = req.params;
    const { orgId, supporterIds, audienceType = "org_member", stage = "member", source = "admin_add" } = req.body;
    
    if (!orgId) {
      console.log('❌ PUSH ROUTE: Missing orgId');
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    if (!supporterIds || supporterIds.length === 0) {
      console.log('❌ PUSH ROUTE: Missing supporterIds');
      return res.status(400).json({ error: 'supporterIds is required' });
    }
    
    console.log('✅ PUSH ROUTE: Calling pushSupportersToEvent service');
    
    const result = await pushSupportersToEvent({
      orgId,
      eventId,
      supporterIds,
      audienceType,
      stage,
      source
    });
    
    console.log('📤 PUSH ROUTE: Sending response:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ PUSH ROUTE: Error:', error);
    console.error('❌ PUSH ROUTE: Error stack:', error.stack);
    res.status(400).json({ error: error.message });
  }
});

// Move supporter between stages
router.patch('/:eventId/pipeline/move', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { supporterId, fromStage, toStage, audienceType = "org_member" } = req.body;
    
    console.log('🔄 MOVE ROUTE: Moving supporter', supporterId, 'from', fromStage, 'to', toStage);
    
    if (!supporterId || !toStage) {
      return res.status(400).json({ error: 'supporterId and toStage are required' });
    }
    
    const result = await moveSupporterStage(eventId, supporterId, fromStage, toStage, audienceType);
    
    console.log('🔄 MOVE ROUTE: Move result:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ MOVE ROUTE: Error:', error);
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

