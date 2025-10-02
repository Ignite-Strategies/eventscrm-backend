import express from 'express';
import EventAttendee from '../models/EventAttendee.js';
import EventPipeline from '../models/EventPipeline.js';

const router = express.Router();

// Get all attendees for an event
router.get('/:eventId/attendees', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { audienceType } = req.query;
    
    const query = { eventId };
    if (audienceType) query.audienceType = audienceType;
    
    const attendees = await EventAttendee.find(query)
      .populate('supporterId')
      .sort({ createdAt: -1 });
    
    res.json(attendees);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get single attendee
router.get('/attendees/:attendeeId', async (req, res) => {
  try {
    const attendee = await EventAttendee.findById(req.params.attendeeId)
      .populate('supporterId');
    
    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }
    
    res.json(attendee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update attendee
router.patch('/attendees/:attendeeId', async (req, res) => {
  try {
    const attendee = await EventAttendee.findByIdAndUpdate(
      req.params.attendeeId,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }
    
    res.json(attendee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

