import express from 'express';
import multer from 'multer';
import { readGeneralContactCSV } from '../services/generalContactCsvReader.js';
import { getContactFieldMapping, normalizeContactRecord } from '../services/generalContactCsvNormalizer.js';
import { validateContactBatch } from '../services/generalContactValidator.js';
import { bulkUpsertGeneralContacts } from '../services/generalContactMutation.js';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/contacts/event/preview - Upload CSV, return preview and field mapping for event upload
router.post('/event/preview', upload.single('file'), async (req, res) => {
  try {
    const { orgId, eventId } = req.body;
    console.log('📝 EVENT PREVIEW: CSV Upload Request for orgId:', orgId, 'eventId:', eventId);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 1. Read CSV
    const readResult = readGeneralContactCSV(req.file.buffer);
    if (!readResult.success) {
      return res.status(400).json({ error: readResult.error });
    }

    // 2. Get field mapping
    const fieldMapping = getContactFieldMapping(readResult.headers);

    // 3. Normalize records for preview
    const normalizedRecords = readResult.records.map(record => normalizeContactRecord(record));

    // 4. Validate records (basic validation for Contact fields)
    const validationResult = validateContactBatch(normalizedRecords);

    // Prepare preview data (first 5 valid records)
    const preview = validationResult.validRecords.slice(0, 5).map(record => ({
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.email,
      phone: record.phone
    }));

    res.json({
      success: true,
      headers: readResult.headers,
      fieldMapping,
      preview,
      totalRecords: readResult.records.length,
      validCount: validationResult.validCount,
      errorCount: validationResult.errorCount,
      errors: validationResult.errors
    });

  } catch (error) {
    console.error('❌ EVENT PREVIEW ERROR:', error);
    res.status(500).json({ error: 'Preview failed: ' + error.message });
  }
});

// POST /api/contacts/event/save - Save contacts to event after preview/matching
router.post('/event/save', upload.single('file'), async (req, res) => {
  try {
    const { orgId, eventId, assignments } = req.body;
    const parsedAssignments = JSON.parse(assignments);
    console.log('📝 EVENT SAVE: Contact Save Request for orgId:', orgId, 'eventId:', eventId, 'assignments:', parsedAssignments);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 1. Read CSV
    const readResult = readGeneralContactCSV(req.file.buffer);
    if (!readResult.success) {
      return res.status(400).json({ error: readResult.error });
    }

    // 2. Normalize records
    const normalizedRecords = readResult.records.map(record => normalizeContactRecord(record));

    // 3. Validate records
    const validationResult = validateContactBatch(normalizedRecords);

    if (validationResult.errorCount > 0) {
      return res.status(400).json({
        error: 'Validation failed for some records',
        errors: validationResult.errors,
        validCount: validationResult.validCount
      });
    }

    // 4. Bulk upsert Contacts
    const mutationResult = await bulkUpsertGeneralContacts(orgId, validationResult.validRecords);

    if (!mutationResult.success) {
      return res.status(500).json({ error: mutationResult.error });
    }

    // 5. Get event data to extract audienceType
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    // 6. Create EventAttendee records for each valid contact
    const eventAttendeeResults = [];
    const defaultStage = parsedAssignments.defaultStage || 'prospect';

    for (const contactData of validationResult.validRecords) {
      try {
        // Find the contact that was just created/updated
        const contact = await prisma.contact.findFirst({
          where: {
            orgId: orgId,
            email: contactData.email
          }
        });

        if (contact) {
          const stage = parsedAssignments.mode === 'individual' 
            ? (parsedAssignments.individualAssignments[contactData.email] || defaultStage)
            : defaultStage;

          const eventAttendee = await prisma.eventAttendee.create({
            data: {
              contactId: contact.id,
              eventId: eventId,
              currentStage: stage,
              audienceType: event?.audienceType || 'general',
              orgId: orgId
            }
          });

          eventAttendeeResults.push(eventAttendee);
        }

      } catch (error) {
        console.error('❌ Error creating EventAttendee for contact:', contactData.email, error);
        // Continue with other contacts even if one fails
      }
    }

    res.json({
      success: true,
      message: 'Contacts uploaded and assigned to event successfully',
      eventAttendees: eventAttendeeResults,
      inserted: mutationResult.inserted,
      updated: mutationResult.updated,
      totalProcessed: validationResult.totalProcessed,
      validCount: validationResult.validCount,
      errors: validationResult.errors
    });

  } catch (error) {
    console.error('❌ EVENT SAVE ERROR:', error);
    res.status(500).json({ error: 'Save failed: ' + error.message });
  }
});

export default router;
