import express from 'express';
import multer from 'multer';
import { readCSV } from '../services/csvReader.js';
import { normalizeRecord } from '../services/orgMemberCsvFieldMapper.js';
import { validateBatch } from '../services/orgMemberCsvValidator.js';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /contacts/upload
 * 
 * Upload CSV of contacts - creates/updates Contact records directly
 * No more Contact → OrgMember chain!
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { 
      orgId, 
      isOrgMember,
      pipelineId,
      audienceType,
      currentStage,
      eventId 
    } = req.body;
    
    console.log('📝 CONTACT CSV UPLOAD:', { orgId, isOrgMember, pipelineId, audienceType, currentStage, eventId });

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 1. Read CSV
    const readResult = readCSV(req.file.buffer);
    if (!readResult.success) {
      return res.status(400).json({ error: readResult.error });
    }

    // 2. Normalize records
    const normalizedRecords = readResult.records.map(record => normalizeRecord(record));

    // 3. Validate records
    const validationResult = validateBatch(normalizedRecords);

    if (validationResult.errorCount > 0) {
      return res.status(400).json({
        error: 'Validation failed for some records',
        errors: validationResult.errors,
        validCount: validationResult.validCount
      });
    }

    // 4. Create/Update Contacts directly (FLAT MODEL!)
    let created = 0;
    let updated = 0;
    const errors = [];

    for (const recordData of validationResult.validRecords) {
      try {
        // Prepare contact data
        const contactData = {
          // Personhood
          firstName: recordData.firstName,
          lastName: recordData.lastName,
          email: recordData.email,
          phone: recordData.phone || null,
          goesBy: recordData.goesBy || null,
          
          // Address
          street: recordData.street || null,
          city: recordData.city || null,
          state: recordData.state || null,
          zip: recordData.zip || null,
          
          // Family
          married: recordData.married === 'true',
          spouseName: recordData.spouseName || null,
          numberOfKids: recordData.numberOfKids ? parseInt(recordData.numberOfKids) : 0,
          
          // Work
          employer: recordData.employer || null,
          
          // Org relationship
          orgId: orgId || null,
          isOrgMember: isOrgMember === 'true',
          yearsWithOrganization: recordData.yearsWithOrganization ? parseInt(recordData.yearsWithOrganization) : null,
          leadershipRole: recordData.leadershipRole || null,
          orgNotes: recordData.notes || null,
          chapterResponsibleFor: recordData.chapterResponsibleFor || null,
          orgTags: recordData.tags ? recordData.tags.split(',').map(tag => tag.trim()) : [],
          engagementValue: recordData.engagementValue ? parseInt(recordData.engagementValue) : null,
          
          // Pipeline tracking
          pipelineId: pipelineId || null,
          audienceType: audienceType || null,
          currentStage: currentStage || null,
          
          // Event relationship
          eventId: eventId || null
        };

        // Upsert Contact
        const contact = await prisma.contact.upsert({
          where: { email: recordData.email },
          update: contactData,
          create: contactData
        });

        if (contact.createdAt === contact.updatedAt) {
          created++;
        } else {
          updated++;
        }

      } catch (error) {
        console.error('❌ Error creating/updating Contact:', recordData.email, error);
        errors.push({
          email: recordData.email,
          error: error.message
        });
      }
    }

    console.log(`✅ CSV Upload Complete: ${created} created, ${updated} updated`);

    res.json({
      success: true,
      message: 'Contacts uploaded successfully',
      created,
      updated,
      totalProcessed: validationResult.totalProcessed,
      validCount: validationResult.validCount,
      errors
    });

  } catch (error) {
    console.error('❌ CONTACT CSV UPLOAD ERROR:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

export default router;

