import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * POST /contacts
 * 
 * Create new Contact
 * (Future: Will be used for manual contact creation)
 */
router.post('/', async (req, res) => {
  try {
    const { 
      orgId, firstName, lastName, email, phone, goesBy,
      employer, street, city, state, zip, notes 
    } = req.body;

    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }

    console.log('📝 Creating new contact:', email, 'for org:', orgId);

    const contact = await prisma.contact.create({
      data: {
        orgId,
        firstName,
        lastName,
        email,
        phone: phone || null,
        goesBy: goesBy || null,
        employer: employer || null,
        street: street || null,
        city: city || null,
        state: state || null,
        zip: zip || null
        // Note: 'notes' is not a Contact field, it belongs to OrgMember
      }
    });

    console.log('✅ Contact created:', contact.id);
    res.status(201).json(contact);

  } catch (error) {
    console.error('❌ Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

/**
 * PATCH /contacts/:contactId
 * 
 * Update existing Contact
 * (Future: Will be used for contact editing)
 */
router.patch('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const updates = req.body;

    console.log('📝 Updating contact:', contactId);

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: updates
    });

    console.log('✅ Contact updated:', contact.id);
    res.json(contact);

  } catch (error) {
    console.error('❌ Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

export default router;

