import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /api/org-member-pipeline?containerId=xxx&orgId=xxx
 * Returns count of contacts at each journey stage for this org
 */
router.get('/', async (req, res) => {
  try {
    const { containerId, orgId } = req.query;

    if (!containerId || !orgId) {
      return res.status(400).json({ error: 'containerId and orgId are required' });
    }

    console.log(`📊 Loading org member pipeline for org: ${orgId}`);

    // Get all contacts for this org
    // ORG MEMBER = Contact with orgId (that's it!)
    const contacts = await prisma.contact.findMany({
      where: {
        containerId,
        orgId  // If they have orgId, they're an org member
      },
      select: {
        currentStage: true
      }
    });

    // Count by stage
    const pipelineCounts = {
      unaware: 0,
      curious: 0,
      activated: 0,
      engaged: 0,
      champion: 0,
      alumni: 0,
      unknown: 0  // No stage assigned yet
    };

    contacts.forEach(contact => {
      const stage = contact.currentStage?.toLowerCase();
      
      // Map stages to journey stages
      if (stage === 'unaware' || stage === 'general_awareness') {
        pipelineCounts.unaware++;
      } else if (stage === 'curious' || stage === 'interested' || stage === 'personal_invite') {
        pipelineCounts.curious++;
      } else if (stage === 'activated' || stage === 'rsvped' || stage === 'soft_commit') {
        pipelineCounts.activated++;
      } else if (stage === 'engaged' || stage === 'attended' || stage === 'followed_up') {
        pipelineCounts.engaged++;
      } else if (stage === 'champion' || stage === 'paid' || stage === 'thanked_paid') {
        pipelineCounts.champion++;
      } else if (stage === 'alumni' || stage === 'dormant') {
        pipelineCounts.alumni++;
      } else {
        pipelineCounts.unknown++;
      }
    });

    const totalMembers = contacts.length;

    console.log(`✅ Pipeline counts:`, pipelineCounts);
    console.log(`✅ Total members: ${totalMembers}`);

    res.json({
      pipeline: pipelineCounts,
      totalMembers,
      breakdown: {
        totalContacts: contacts.length,
        withStage: contacts.filter(c => c.currentStage).length,
        withoutStage: contacts.filter(c => !c.currentStage).length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching org member pipeline:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline data' });
  }
});

/**
 * GET /api/org-member-pipeline/stage/:stage
 * Returns list of contacts in a specific journey stage
 */
router.get('/stage/:stage', async (req, res) => {
  try {
    const { stage } = req.params;
    const { containerId, orgId } = req.query;

    if (!containerId || !orgId) {
      return res.status(400).json({ error: 'containerId and orgId are required' });
    }

    // Map journey stage to actual database stages
    const stageMapping = {
      unaware: ['unaware', 'general_awareness'],
      curious: ['curious', 'interested', 'personal_invite', 'expressed_interest'],
      activated: ['activated', 'rsvped', 'soft_commit'],
      engaged: ['engaged', 'attended', 'followed_up'],
      champion: ['champion', 'paid', 'thanked_paid'],
      alumni: ['alumni', 'dormant']
    };

    const dbStages = stageMapping[stage.toLowerCase()] || [stage];

    const contacts = await prisma.contact.findMany({
      where: {
        containerId,
        orgId,
        isOrgMember: true,
        currentStage: {
          in: dbStages
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        currentStage: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      stage,
      count: contacts.length,
      contacts
    });

  } catch (error) {
    console.error('❌ Error fetching contacts by stage:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

export default router;

