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

// GET /api/contacts/event/schema - Get valid audience types and stages for event upload
router.get('/event/schema', async (req, res) => {
  try {
    // Return the same schema config as the main schema route
    res.json({
      audienceTypes: [
        'org_members',
        'friends_family', 
        'landing_page_public',
        'community_partners',
        'cold_outreach'
      ],
      stages: [
        'in_funnel',
        'general_awareness',
        'personal_invite',
        'expressed_interest',
        'soft_commit',
        'paid'
      ]
    });
  } catch (error) {
    console.error('❌ SCHEMA ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

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

    // Validate required assignment fields
    if (!parsedAssignments.audienceType || !parsedAssignments.defaultStage) {
      return res.status(400).json({ 
        error: 'audienceType and defaultStage are required in assignments',
        required: ['audienceType', 'defaultStage'],
        received: Object.keys(parsedAssignments)
      });
    }

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

    // 5. Create EventAttendee records for each valid contact with proper audience type and stage
    const eventAttendeeResults = [];
    const orgMemberResults = [];
    const defaultStage = parsedAssignments.defaultStage;

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

          // Create EventAttendee with proper audience type and stage from assignments
          const eventAttendee = await prisma.eventAttendee.create({
            data: {
              contactId: contact.id,
              eventId: eventId,
              currentStage: stage,
              audienceType: parsedAssignments.audienceType, // Use assigned audience type
              orgId: orgId
            }
          });

          eventAttendeeResults.push(eventAttendee);

          // OPTIONALLY create OrgMember if requested in assignments
          if (parsedAssignments.createOrgMembers === true) {
            try {
              const orgMember = await prisma.orgMember.create({
                data: {
                  contactId: contact.id,
                  orgId: orgId,
                  // Add any additional OrgMember fields from the CSV if available
                  employer: contactData.employer || null,
                  street: contactData.street || null,
                  city: contactData.city || null,
                  state: contactData.state || null,
                  zip: contactData.zip || null,
                  notes: contactData.notes || null
                }
              });
              orgMemberResults.push(orgMember);
              console.log('✅ Created OrgMember for contact:', contact.email);
            } catch (orgMemberError) {
              console.error('❌ Error creating OrgMember for contact:', contact.email, orgMemberError);
              // Continue even if OrgMember creation fails
            }
          }

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
      orgMembers: orgMemberResults,
      inserted: mutationResult.inserted,
      updated: mutationResult.updated,
      totalProcessed: validationResult.totalProcessed,
      validCount: validationResult.validCount,
      eventAttendeesCreated: eventAttendeeResults.length,
      orgMembersCreated: orgMemberResults.length,
      assignments: {
        audienceType: parsedAssignments.audienceType,
        defaultStage: parsedAssignments.defaultStage,
        createOrgMembers: parsedAssignments.createOrgMembers || false
      },
      errors: validationResult.errors
    });

  } catch (error) {
    console.error('❌ EVENT SAVE ERROR:', error);
    res.status(500).json({ error: 'Save failed: ' + error.message });
  }
});

export default router;
