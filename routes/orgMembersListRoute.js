import express from 'express';
import multer from 'multer';
import { readCSV } from '../services/csvReader.js';
import { normalizeRecord } from '../services/csvNormalizer.js';
import { validateBatch } from '../services/csvValidator.js';
import { bulkUpsertSupporters, createSupporter, deleteSupporter, getSupportersByOrg } from '../services/supporterMutation.js';
import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Migration route to update old engagement categories
router.post('/migrate-engagement-categories', async (req, res) => {
  try {
    console.log('🔄 MIGRATION: Starting engagement category migration');
    
    const result = await prisma.supporter.updateMany({
      where: { categoryOfEngagement: "general" },
      data: { categoryOfEngagement: "medium" }
    });
    
    console.log('🔄 MIGRATION: Updated', result.count, 'supporters from "general" to "medium"');
    
    res.json({
      success: true,
      message: `Updated ${result.count} supporters from "general" to "medium"`,
      modifiedCount: result.count
    });
  } catch (error) {
    console.error('🔄 MIGRATION ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test route to check database connection
router.get('/test-db/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    console.log('🧪 TEST: Testing database connection for orgId:', orgId);
    
    const result = await getSupportersByOrg(orgId);
    console.log('🧪 TEST: Database test result:', result);
    
    res.json({
      success: true,
      message: 'Database connection working',
      orgId,
      supportersCount: result.supporters?.length || 0
    });
  } catch (error) {
    console.error('🧪 TEST ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create single supporter
router.post('/:orgId/supporters', async (req, res) => {
  try {
    const { orgId } = req.params;
    const result = await createSupporter(orgId, req.body);
    
    if (result.success) {
      res.json(result.supporter);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk CSV upload
router.post('/:orgId/supporters/csv', upload.single('file'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    console.log('CSV Upload Request:', { orgId, file: req.file ? req.file.originalname : 'No file' });
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // 1. Read CSV
    const readResult = readCSV(req.file.buffer);
    if (!readResult.success) {
      return res.status(400).json({ error: readResult.error });
    }
    
    // 2. Normalize field names
    const normalizedRecords = readResult.records.map(record => normalizeRecord(record));
    
    // 3. Validate records
    const validationResult = validateBatch(normalizedRecords);
    console.log('CSV Processing Results:', { 
      total: validationResult.totalProcessed,
      valid: validationResult.validCount,
      errors: validationResult.errorCount 
    });
    
    // 4. Database mutation
    console.log('🚀 ROUTE: About to call bulkUpsertSupporters with', validationResult.validRecords.length, 'records');
    const mutationResult = await bulkUpsertSupporters(orgId, validationResult.validRecords);
    console.log('🚀 ROUTE: Mutation result:', mutationResult);
    
    if (!mutationResult.success) {
      console.error('🚀 ROUTE: Mutation failed:', mutationResult.error);
      return res.status(400).json({ error: mutationResult.error });
    }
    
    // 5. Verify data was actually saved
    console.log('🚀 ROUTE: Verifying data was saved...');
    const verifyResult = await getSupportersByOrg(orgId);
    console.log('🚀 ROUTE: Verification - supporters count:', verifyResult.supporters?.length || 0);
    
    res.json({
      success: true,
      inserted: mutationResult.inserted,
      updated: mutationResult.updated,
      total: validationResult.validCount,
      errors: validationResult.errors,
      verified: verifyResult.supporters?.length || 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List supporters (PRISMA - Contact + OrgMember)
router.get('/:orgId/supporters', async (req, res) => {
  try {
    const { orgId } = req.params;
    console.log('📋 GET: Fetching org members (contacts with OrgMember) for orgId:', orgId);
    
    // Query Contacts with OrgMember relation
    const contacts = await prisma.contact.findMany({
      where: { 
        orgId,
        orgMember: { isNot: null }  // Only contacts with OrgMember
      },
      include: {
        orgMember: true
      }
    });
    
    // Format for frontend compatibility (merge Contact + OrgMember)
    const formatted = contacts.map(c => ({
      _id: c.id,  // contactId as _id for frontend
      contactId: c.id,
      orgMemberId: c.orgMember?.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      goesBy: c.orgMember?.goesBy,
      street: c.orgMember?.street,
      city: c.orgMember?.city,
      state: c.orgMember?.state,
      zip: c.orgMember?.zip,
      employer: c.orgMember?.employer,
      yearsWithOrganization: c.orgMember?.yearsWithOrganization,
      categoryOfEngagement: c.orgMember?.categoryOfEngagement || 'medium',
      tags: c.orgMember?.tags || []
    }));
    
    console.log('📋 GET: Returning', formatted.length, 'org members');
    res.json(formatted);
  } catch (error) {
    console.error('📋 GET: Route error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update supporter field (PRISMA - contactId = supporterId for compatibility)
router.post('/supporters/:supporterId/update', async (req, res) => {
  try {
    const contactId = req.params.supporterId;  // supporterId is actually contactId
    const { field, value } = req.body;
    
    console.log('✏️ PATCH: Updating contact/orgMember', contactId, 'field:', field, 'value:', value);
    
    if (!field) {
      return res.status(400).json({ error: 'Field is required' });
    }
    
    // Determine if field is Contact or OrgMember field
    const contactFields = ['firstName', 'lastName', 'email', 'phone'];
    const updateData = { [field]: value };
    
    if (contactFields.includes(field)) {
      // Update Contact
      await prisma.contact.update({
        where: { id: contactId },
        data: updateData
      });
    } else {
      // Update OrgMember (or create if doesn't exist)
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: { orgMember: true }
      });
      
      if (contact.orgMember) {
        await prisma.orgMember.update({
          where: { id: contact.orgMember.id },
          data: updateData
        });
      }
    }
    
    // Return updated contact with orgMember
    const updated = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { orgMember: true }
    });
    
    console.log('✏️ PATCH: Successfully updated');
    res.json({
      success: true,
      supporter: {
        _id: updated.id,
        ...updated,
        ...updated.orgMember
      }
    });
  } catch (error) {
    console.error('✏️ PATCH ERROR:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete supporter (PRISMA - contactId = supporterId for compatibility)
router.delete('/supporters/:supporterId', async (req, res) => {
  try {
    const contactId = req.params.supporterId;  // supporterId is actually contactId
    
    console.log('🗑️ DELETE: Deleting contact:', contactId);
    
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Delete contact (cascades to OrgMember, EventAttendee, Admin)
    await prisma.contact.delete({
      where: { id: contactId }
    });
    
    console.log('✅ DELETE: Contact deleted successfully');
    res.json({ 
      success: true, 
      message: 'Contact deleted',
      deletedSupporter: contact
    });
  } catch (error) {
    console.error('❌ DELETE ERROR:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

