import express from 'express';
import ContactEventMembership from '../models/ContactEventMembership.js';
import { applyPaid } from '../services/pipelineService.js';

const router = express.Router();

// Webhook from pay-backend when payment is confirmed
router.post('/payment', async (req, res) => {
  try {
    const { membershipId, amount, stripeSessionId } = req.body;
    
    if (!membershipId) {
      return res.status(400).json({ error: 'Missing membershipId' });
    }
    
    // Update membership
    let membership = await ContactEventMembership.findById(membershipId);
    
    if (!membership) {
      console.warn(`Membership ${membershipId} not found for payment webhook`);
      return res.status(404).json({ error: 'Membership not found' });
    }
    
    // Apply paid logic (auto-advance to "paid" stage)
    membership = applyPaid(membership, amount);
    await membership.save();
    
    console.log(`✅ Membership ${membershipId} marked as paid: $${amount}`);
    
    res.json({ 
      success: true, 
      membership,
      message: 'Payment confirmed and stage updated'
    });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

