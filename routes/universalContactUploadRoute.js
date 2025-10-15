import express from 'express';
import multer from 'multer';
import { parseAndPrepareCSV } from '../services/csvParserService.js';
import { 
  mapFieldsForType, 
  validateMappedRecord, 
  splitRecordForSave,
  getFieldMappingSuggestions,
  UNIVERSAL_FIELD_MAP
} from '../services/universalCsvFieldMapperService.js';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/contacts/upload/schema/:type
 * Get schema and field mapping suggestions for a specific upload type
 */
router.get('/schema/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['contact', 'orgMember', 'eventAttendee'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid upload type', 
        validTypes 
      });
    }

    // Get all available fields for this type
    const availableFields = Object.values(UNIVERSAL_FIELD_MAP)
      .filter(field => field.types.includes(type))
      .map(field => field.field);

    res.json({
      success: true,
      uploadType: type,
      availableFields,
      schema: {
        contact: ['firstName', 'lastName', 'email', 'phone', 'goesBy', 'employer', 'street', 'city', 'state', 'zip', 'birthday', 'married', 'spouseName', 'numberOfKids'],
        orgMember: ['yearsWithOrganization', 'leadershipRole', 'originStory', 'notes', 'tags'],
        eventAttendee: ['currentStage', 'audienceType', 'attended', 'ticketType', 'amountPaid', 'spouseOrOther', 'howManyInParty']
      }
    });
  } catch (error) {
    console.error('❌ SCHEMA ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contacts/upload/preview
 * Universal CSV preview - works for any upload type
 */
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    const { uploadType, orgId, eventId } = req.body;
    console.log('📝 UNIVERSAL PREVIEW: CSV Upload Request for type:', uploadType, 'orgId:', orgId);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 1. Read CSV
    const readResult = parseAndPrepareCSV(req.file.buffer);
    if (!readResult.success) {
      return res.status(400).json({ error: readResult.error });
    }

    // 2. Get field mapping suggestions
    const fieldMappingSuggestions = getFieldMappingSuggestions(readResult.headers, uploadType);

    // 3. Map and validate records
    const mappedRecords = [];
    const validationResults = [];
    let validCount = 0;
    let errorCount = 0;

    for (const record of readResult.records) {
      const mapped = mapFieldsForType(record, uploadType);
      const validation = validateMappedRecord(mapped, uploadType);
      
      mappedRecords.push(mapped);
      validationResults.push(validation);
      
      if (validation.isValid) {
        validCount++;
      } else {
        errorCount++;
      }
    }

    // 4. Prepare preview data (first 5 valid records)
    const preview = mappedRecords
      .filter((_, index) => validationResults[index].isValid)
      .slice(0, 5);

    res.json({
      success: true,
      uploadType,
      headers: readResult.headers,
      fieldMappingSuggestions,
      preview,
      totalRecords: readResult.records.length,
      validCount,
      errorCount,
      validationResults: validationResults.slice(0, 5) // Show first 5 validation results
    });

  } catch (error) {
    console.error('❌ UNIVERSAL PREVIEW ERROR:', error);
    res.status(500).json({ error: 'Preview failed: ' + error.message });
  }
});

/**
 * POST /api/contacts/upload/save
 * Universal CSV save - handles Contact, OrgMember, and EventAttendee creation
 */
router.post('/save', upload.single('file'), async (req, res) => {
  try {
    const { uploadType, orgId, eventId, assignments } = req.body;
    const parsedAssignments = assignments ? JSON.parse(assignments) : {};
    
    console.log('📝 UNIVERSAL SAVE: Contact Save Request for type:', uploadType, 'orgId:', orgId);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 1. Read CSV
    const readResult = parseAndPrepareCSV(req.file.buffer);
    if (!readResult.success) {
      return res.status(400).json({ error: readResult.error });
    }

    // 2. Map and validate records
    const validRecords = [];
    const errors = [];

    for (const record of readResult.records) {
      const mapped = mapFieldsForType(record, uploadType);
      const validation = validateMappedRecord(mapped, uploadType);
      
      if (validation.isValid) {
        validRecords.push(mapped);
      } else {
        errors.push({
          record: mapped,
          errors: validation.errors
        });
      }
    }

    // 3. Universal save logic
    let contactResults = [];
    let orgMemberResults = [];
    let eventAttendeeResults = [];

    for (const record of validRecords) {
      try {
        // Split record into Contact, OrgMember, EventAttendee data
        const { contactData, orgMemberData, eventAttendeeData } = splitRecordForSave(record, uploadType);

        // 1. Always create/update Contact (universal personhood)
        const contact = await prisma.contact.upsert({
          where: { email: contactData.email },
          update: contactData,
          create: contactData
        });

        contactResults.push(contact);

        // 2. Create OrgMember if orgMemberData exists
        if (orgMemberData && uploadType === 'orgMember') {
          const orgMember = await prisma.orgMember.upsert({
            where: { 
              contactId: contact.id
            },
            update: {
              orgId: orgId,
              ...orgMemberData
            },
            create: {
              contactId: contact.id,
              orgId: orgId,
              ...orgMemberData
            }
          });
          orgMemberResults.push(orgMember);
        }

        // 3. Create EventAttendee if eventAttendeeData exists
        if (eventAttendeeData && uploadType === 'eventAttendee' && eventId) {
          const eventAttendee = await prisma.eventAttendee.create({
            data: {
              contactId: contact.id,
              eventId: eventId,
              orgId: orgId,
              ...eventAttendeeData
            }
          });
          eventAttendeeResults.push(eventAttendee);
        }

        // 4. Handle assignments for special cases (like champions upload)
        if (parsedAssignments.audienceType && eventId) {
          await prisma.eventAttendee.upsert({
            where: {
              eventId_contactId_audienceType: {
                eventId: eventId,
                contactId: contact.id,
                audienceType: parsedAssignments.audienceType
              }
            },
            update: {
              currentStage: parsedAssignments.defaultStage || 'aware'
            },
            create: {
              eventId: eventId,
              contactId: contact.id,
              orgId: orgId,
              audienceType: parsedAssignments.audienceType,
              currentStage: parsedAssignments.defaultStage || 'aware'
            }
          });
        }

      } catch (error) {
        console.error('❌ Error processing record:', error);
        errors.push({
          record,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Universal upload completed for ${uploadType}`,
      uploadType,
      contacts: contactResults.length,
      orgMembers: orgMemberResults.length,
      eventAttendees: eventAttendeeResults.length,
      totalProcessed: readResult.records.length,
      validCount: validRecords.length,
      errorCount: errors.length,
      errors
    });

  } catch (error) {
    console.error('❌ UNIVERSAL SAVE ERROR:', error);
    res.status(500).json({ error: 'Save failed: ' + error.message });
  }
});

export default router;
