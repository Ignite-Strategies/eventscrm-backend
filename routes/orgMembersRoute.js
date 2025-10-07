import express from 'express';
import multer from 'multer';
import { getPrismaClient } from '../config/database.js';
import { readCSV } from '../services/csvReader.js';
import { normalizeRecord } from '../services/csvNormalizer.js';
import { validateBatch } from '../services/csvValidator.js';

const router = express.Router();
const prisma = getPrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Find or Create OrgMember by Firebase googleId
 * Used during sign-in/sign-up flow
 */
router.post('/findOrCreate', async (req, res) => {
  try {
    const { firebaseId, email, firstName, lastName, photoURL } = req.body;
    
    console.log('🔍 FindOrCreate OrgMember for firebaseId:', firebaseId);
    
    // Find existing OrgMember by firebaseId
    let orgMember = await prisma.orgMember.findUnique({
      where: { firebaseId }
    });
    
    if (orgMember) {
      console.log('✅ Existing OrgMember found:', orgMember.email);
      return res.json(orgMember);
    }
    
    // Create new OrgMember (minimal fields, rest are null)
    console.log('📝 Creating new OrgMember for:', email);
    orgMember = await prisma.orgMember.create({
      data: {
        firebaseId,
        email: email || '',
        firstName: firstName || '',
        lastName: lastName || '',
        photoURL: photoURL || null,
        role: null, // No role until they create/join org
        orgId: null, // Will be set when they create/join org
        // All other fields default to null
        goesBy: null,
        phone: null,
        street: null,
        city: null,
        state: null,
        zip: null,
        employer: null,
        yearsWithOrganization: null,
        birthday: null,
        married: false,
        spouseName: null,
        numberOfKids: 0,
        originStory: null,
        notes: null
      }
    });
    
    console.log('✅ New OrgMember created:', orgMember.id);
    res.status(201).json(orgMember);
    
  } catch (error) {
    console.error('❌ FindOrCreate error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get OrgMember by ID
 */
router.get('/:orgMemberId', async (req, res) => {
  try {
    const orgMember = await prisma.orgMember.findUnique({
      where: { id: req.params.orgMemberId }
    });
    
    if (!orgMember) {
      return res.status(404).json({ error: 'OrgMember not found' });
    }
    
    res.json(orgMember);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get OrgMember by firebaseId
 */
router.get('/by-firebase/:firebaseId', async (req, res) => {
  try {
    const orgMember = await prisma.orgMember.findUnique({
      where: { firebaseId: req.params.firebaseId }
    });
    
    if (!orgMember) {
      return res.status(404).json({ error: 'OrgMember not found' });
    }
    
    res.json(orgMember);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update OrgMember (for profile setup)
 */
router.patch('/:orgMemberId', async (req, res) => {
  try {
    console.log('📝 PATCH OrgMember:', req.params.orgMemberId);
    console.log('📝 Update data:', req.body);
    
    const orgMember = await prisma.orgMember.update({
      where: { id: req.params.orgMemberId },
      data: req.body
    });
    
    console.log('✅ OrgMember updated:', orgMember.email);
    res.json(orgMember);
  } catch (error) {
    console.error('❌ PATCH OrgMember error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

