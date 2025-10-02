import express from 'express';
import { 
  pushSupportersToEvent, 
  pushAllSupportersToEvent,
  pushSupportersByTag 
} from '../services/eventPipelineService.js';

const router = express.Router();

// Push specific supporters to event pipeline
router.post('/:eventId/pipeline/push', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { 
      orgId, 
      supporterIds, 
      audienceType = "org_member",
      stage = "member",
      source = "admin_add"
    } = req.body;

    const results = await pushSupportersToEvent({
      orgId,
      eventId,
      supporterIds,
      audienceType,
      stage,
      source
    });

    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Push ALL supporters to event
router.post('/:eventId/pipeline/push-all', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { 
      orgId, 
      audienceType = "org_member",
      stage = "member" 
    } = req.body;

    const results = await pushAllSupportersToEvent({
      orgId,
      eventId,
      audienceType,
      stage,
      source: "bulk_import"
    });

    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Push supporters by tag
router.post('/:eventId/pipeline/push-by-tag', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { 
      orgId, 
      tags,
      audienceType = "org_member",
      stage = "member" 
    } = req.body;

    const results = await pushSupportersByTag({
      orgId,
      eventId,
      tags,
      audienceType,
      stage,
      source: "tag_filter"
    });

    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

