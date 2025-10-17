import express from 'express';
import multer from 'multer';
import { parseAndPrepareCSV } from '../services/csvParserService.js';
import { 
  mapFieldsForType, 
  validateMappedRecord, 
  mapCsvToContact,
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
 * CONTACT-FIRST CSV save - Everything goes into Contact model!
 */
router.post('/save', upload.single('file'), async (req, res) => {
  try {
    const { uploadType, orgId, eventId, assignments } = req.body;
    const parsedAssignments = assignments ? JSON.parse(assignments) : {};
    
    console.log('📝 CONTACT-FIRST SAVE: CSV Save Request for type:', uploadType, 'orgId:', orgId);

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

    console.log('📊 CSV Records to process:', readResult.records.length);
    console.log('📊 First record sample:', readResult.records[0]);

    for (const record of readResult.records) {
      const mapped = mapFieldsForType(record, uploadType);
      const validation = validateMappedRecord(mapped, uploadType);
      
      console.log('📊 Mapped record:', mapped);
      console.log('📊 Validation result:', validation);
      
      if (validation.isValid) {
        validRecords.push(mapped);
      } else {
        errors.push({
          record: mapped,
          errors: validation.errors
        });
      }
    }

    console.log('📊 Valid records:', validRecords.length);
    console.log('📊 Errors:', errors.length);

    // 3. CONTACT-FIRST SAVE: Everything goes into Contact model!
    let contactResults = [];
    let contactsCreated = 0;
    let contactsUpdated = 0;

    for (const record of validRecords) {
      try {
        console.log('💾 Processing record:', record);
        
        // CONTACT-FIRST: Everything goes into Contact model with containerId/orgId/eventId!
        const { contactData } = mapCsvToContact(record, uploadType, orgId, eventId);
        
        console.log('💾 Contact data to save:', contactData);

        // Upsert Contact with ALL data
        const existingContact = await prisma.contact.findUnique({
          where: { email: contactData.email }
        });
        
        const contact = await prisma.contact.upsert({
          where: { email: contactData.email },
          update: contactData,
          create: contactData
        });

        contactResults.push(contact);
        
        if (existingContact) {
          contactsUpdated++;
        } else {
          contactsCreated++;
        }

        console.log(`✅ Contact processed: ${contact.email} (${existingContact ? 'updated' : 'created'})`);

      } catch (error) {
        console.error(`❌ Error processing record:`, error);
        errors.push(`Record ${validRecords.indexOf(record) + 1}: ${error.message}`);
      }
    }

    console.log(`📊 CONTACT-FIRST CSV Save Complete: ${contactsCreated} created, ${contactsUpdated} updated`);

    // Check if we actually processed any records
    const totalProcessed = contactsCreated + contactsUpdated;
    
    if (totalProcessed === 0) {
      console.log('❌ NO RECORDS PROCESSED - Returning error response');
      return res.status(400).json({
        success: false,
        error: 'No records were successfully processed',
        message: 'All records failed validation or database save',
        results: {
          contactsCreated: 0,
          contactsUpdated: 0,
          totalProcessed: 0
        },
        errors: errors
      });
    }

    res.json({
      success: true,
      message: `Successfully processed ${totalProcessed} contacts`,
      results: {
        contactsCreated,
        contactsUpdated,
        totalProcessed
      },
      errors: errors
    });

  } catch (error) {
    console.error('❌ CSV Save Error:', error);
    res.status(500).json({ 
      error: 'Failed to save CSV data',
      details: error.message 
    });
  }
});

export default router;