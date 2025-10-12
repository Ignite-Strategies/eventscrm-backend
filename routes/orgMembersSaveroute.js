import express from 'express';
import multer from 'multer';
import { readCSV } from '../services/csvReader.js';
import { normalizeRecord } from '../services/csvNormalizer.js';
import { validateBatch } from '../services/csvValidator.js';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// POST /orgmember/csv - Upload CSV and create Contact + OrgMember records
router.post('/orgmember/csv', upload.single('file'), async (req, res) => {
  try {
    const { orgId, addToEvent, eventId, audienceType, currentStage } = req.body;
    console.log('📝 ORG MEMBER CSV: Upload Request for orgId:', orgId);
    console.log('📝 Event Assignment:', { addToEvent, eventId, audienceType, currentStage });

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

    // 4. Create Contact + OrgMember records (Contact-First Architecture)
    let inserted = 0;
    let updated = 0;
    const errors = [];

    for (const recordData of validationResult.validRecords) {
      try {
        // Create Contact first (UNIVERSAL - no orgId!)
        const contact = await prisma.contact.upsert({
          where: {
            email: recordData.email  // Global unique lookup
          },
          update: {
            firstName: recordData.firstName,
            lastName: recordData.lastName,
            phone: recordData.phone || null
          },
          create: {
            firstName: recordData.firstName,
            lastName: recordData.lastName,
            email: recordData.email,
            phone: recordData.phone || null
          }
        });

        // Then create OrgMember (THE BRIDGE between Contact and Org)
        // For MVP1: contactId is unique, but orgId creates the relationship
        const existingOrgMember = await prisma.orgMember.findUnique({
          where: { contactId: contact.id }
        });

        if (existingOrgMember) {
          // Update existing OrgMember (only if it's for the same org!)
          if (existingOrgMember.orgId !== orgId) {
            throw new Error(`Contact ${recordData.email} is already a member of a different org`);
          }
          
          await prisma.orgMember.update({
            where: { contactId: contact.id },
            data: {
              goesBy: recordData.goesBy || null,
              street: recordData.street || null,
              city: recordData.city || null,
              state: recordData.state || null,
              zip: recordData.zip || null,
              employer: recordData.employer || null,
              yearsWithOrganization: recordData.yearsWithOrganization ? parseInt(recordData.yearsWithOrganization) : null,
              married: recordData.married === 'true',
              spouseName: recordData.spouseName || null,
              numberOfKids: recordData.numberOfKids ? parseInt(recordData.numberOfKids) : 0,
              originStory: recordData.originStory || null,
              notes: recordData.notes || null,
              categoryOfEngagement: recordData.categoryOfEngagement || 'general',
              tags: recordData.tags ? recordData.tags.split(',').map(tag => tag.trim()) : []
            }
          });
          updated++;
        } else {
          // Create new OrgMember
          await prisma.orgMember.create({
            data: {
              contactId: contact.id,
              orgId: orgId,
              goesBy: recordData.goesBy || null,
              street: recordData.street || null,
              city: recordData.city || null,
              state: recordData.state || null,
              zip: recordData.zip || null,
              employer: recordData.employer || null,
              yearsWithOrganization: recordData.yearsWithOrganization ? parseInt(recordData.yearsWithOrganization) : null,
              married: recordData.married === 'true',
              spouseName: recordData.spouseName || null,
              numberOfKids: recordData.numberOfKids ? parseInt(recordData.numberOfKids) : 0,
              originStory: recordData.originStory || null,
              notes: recordData.notes || null,
              categoryOfEngagement: recordData.categoryOfEngagement || 'general',
              tags: recordData.tags ? recordData.tags.split(',').map(tag => tag.trim()) : []
            }
          });
          inserted++;
        }

        // 3. Add to Event if requested
        if (addToEvent === 'true' && eventId && audienceType && currentStage) {
          await prisma.eventAttendee.upsert({
            where: {
              eventId_contactId_audienceType: {
                eventId: eventId,
                contactId: contact.id,
                audienceType: audienceType
              }
            },
            update: {
              currentStage: currentStage
            },
            create: {
              eventId: eventId,
              contactId: contact.id,
              audienceType: audienceType,
              currentStage: currentStage,
              notes: {}
            }
          });
        }

      } catch (error) {
        console.error('❌ Error creating Contact + OrgMember for:', recordData.email, error);
        errors.push({
          email: recordData.email,
          error: error.message
        });
      }
    }

    // Get event name if added to event
    let eventAssignment = null;
    if (addToEvent === 'true' && eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (event) {
        eventAssignment = {
          eventName: event.name,
          audienceType: audienceType,
          stage: currentStage
        };
      }
    }

    res.json({
      success: true,
      message: 'Org members uploaded successfully',
      inserted,
      updated,
      totalProcessed: validationResult.totalProcessed,
      validCount: validationResult.validCount,
      errors,
      eventAssignment
    });

  } catch (error) {
    console.error('❌ ORG MEMBER CSV ERROR:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

export default router;
