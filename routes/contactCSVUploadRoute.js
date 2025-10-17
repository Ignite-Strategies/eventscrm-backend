/**
 * CONTACT-FIRST CSV UPLOAD ROUTE
 * 
 * Uses Contact model with containerId/orgId/eventId
 * NO separate OrgMember/EventAttendee tables!
 */

const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for CSV uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/contacts/csv-upload
 * Contact-first CSV upload - everything goes into Contact model
 */
router.post('/csv-upload', upload.single('file'), async (req, res) => {
  try {
    const { orgId, eventId } = req.body;
    console.log('📝 CONTACT-FIRST CSV UPLOAD: orgId:', orgId, 'eventId:', eventId);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Default containerId (F3 CRM)
    const containerId = 'cmgu7w02h0000ceaqt7iz6bf9';
    
    const results = [];
    const errors = [];

    // Parse CSV
    const csvData = [];
    const buffer = req.file.buffer.toString();
    const lines = buffer.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    console.log('📋 CSV Headers:', headers);

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header.toLowerCase()] = values[index] || '';
        });
        csvData.push(row);
      }
    }

    console.log(`📊 Processing ${csvData.length} records...`);

    // Process each row
    for (const row of csvData) {
      try {
        // Map CSV fields to Contact model
        const contactData = {
          email: row.email || row.e_mail || '',
          firstName: row.firstname || row.first_name || row.first || '',
          lastName: row.lastname || row.last_name || row.last || '',
          goesBy: row.goesby || row.goes_by || row.nickname || '',
          phone: row.phone || row.phone_number || '',
          street: row.street || row.address || '',
          city: row.city || '',
          state: row.state || '',
          zip: row.zip || row.zipcode || '',
          employer: row.employer || row.company || '',
          yearsWithOrganization: row.yearswithorg || row.years_with_org || row.years || '',
          chapterResponsible: row.chapter || row.chapter_responsible || '',
          // CONTACT-FIRST: Set containerId, orgId, eventId
          containerId: containerId,
          orgId: orgId || null,
          eventId: eventId || null
        };

        // Skip if no email
        if (!contactData.email) {
          errors.push(`Row ${csvData.indexOf(row) + 2}: No email provided`);
          continue;
        }

        // Upsert contact
        const contact = await prisma.contact.upsert({
          where: { email: contactData.email },
          update: contactData,
          create: contactData
        });

        results.push({
          email: contact.email,
          name: `${contact.firstName} ${contact.lastName}`,
          action: 'created' // Could be 'updated' if we track this
        });

        console.log(`✅ Contact processed: ${contact.email}`);

      } catch (error) {
        console.error(`❌ Error processing row:`, error);
        errors.push(`Row ${csvData.indexOf(row) + 2}: ${error.message}`);
      }
    }

    console.log(`📊 CSV Upload Complete: ${results.length} contacts processed, ${errors.length} errors`);

    res.json({
      success: true,
      message: `Successfully processed ${results.length} contacts`,
      results: results,
      errors: errors,
      summary: {
        totalProcessed: results.length,
        totalErrors: errors.length
      }
    });

  } catch (error) {
    console.error('❌ CSV Upload Error:', error);
    res.status(500).json({ 
      error: 'Failed to process CSV upload',
      details: error.message 
    });
  }
});

module.exports = router;