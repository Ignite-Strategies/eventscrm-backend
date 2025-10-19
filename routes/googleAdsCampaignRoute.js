import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { generateGoogleAdsCampaign } from '../services/aiCampaignGenerator.js';
import { reverseEngineerSearches } from '../services/searchReverseEngineerService.js';

const router = express.Router();
const prisma = getPrismaClient();

// POST /api/googleads/generate-searches - Reverse engineer searches from persona data
router.post("/generate-searches", async (req, res) => {
  try {
    const { demographics, ageRange, location, painPoint, emotionalState, desire } = req.body;

    if (!demographics || !painPoint || !desire) {
      return res.status(400).json({ error: "demographics, painPoint, and desire are required" });
    }

    const result = await reverseEngineerSearches({
      demographics,
      ageRange: ageRange || "Not specified",
      location: location || "Not specified",
      painPoint,
      emotionalState: emotionalState || "Not specified",
      desire
    });

    if (!result.success) {
      return res.status(500).json({ error: "Failed to generate searches", details: result.error });
    }

    console.log(`✅ Search reverse engineering complete`);
    res.json(result.data);
  } catch (error) {
    console.error("❌ Error generating searches:", error);
    res.status(500).json({ error: "Failed to generate searches" });
  }
});

// POST /api/googleads/campaign/generate - AI-generate campaign from persona
router.post("/generate", async (req, res) => {
  try {
    const { personaId, orgId, objective, dailyBudget, additionalContext } = req.body;

    if (!personaId || !orgId) {
      return res.status(400).json({ error: "personaId and orgId are required" });
    }

    // Fetch persona
    const persona = await prisma.persona.findFirst({
      where: { id: personaId, orgId }
    });

    if (!persona) {
      return res.status(404).json({ error: "Persona not found" });
    }

    // Generate campaign using AI
    const result = await generateGoogleAdsCampaign(persona, {
      objective,
      dailyBudget,
      additionalContext
    });

    if (!result.success) {
      return res.status(500).json({ error: "Failed to generate campaign", details: result.error });
    }

    console.log(`✅ AI campaign generated for persona: ${persona.personaName}`);
    res.json(result.campaign);
  } catch (error) {
    console.error("❌ Error generating campaign:", error);
    res.status(500).json({ error: "Failed to generate campaign" });
  }
});

// POST /api/googleads/campaign - Create campaign (save to DB)
router.post("/", async (req, res) => {
  try {
    const {
      orgId,
      personaId,
      googleAdAccountId,
      name,
      objective,
      dailyBudget,
      startDate,
      endDate,
      adGroups // Array of ad groups with keywords and creatives
    } = req.body;

    if (!orgId || !name) {
      return res.status(400).json({ error: "orgId and name are required" });
    }

    // Create campaign with ad groups and creatives in a transaction
    const campaign = await prisma.$transaction(async (tx) => {
      // Create campaign
      const newCampaign = await tx.googleAdCampaign.create({
        data: {
          orgId,
          personaId: personaId || null,
          googleAdAccountId: googleAdAccountId || null,
          name,
          objective: objective || "awareness",
          dailyBudget: dailyBudget ? parseFloat(dailyBudget) : null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          status: "draft"
        }
      });

      // Create ad groups if provided
      if (adGroups && adGroups.length > 0) {
        for (const adGroupData of adGroups) {
          const adGroup = await tx.googleAdGroup.create({
            data: {
              campaignId: newCampaign.id,
              name: adGroupData.name || "Default Ad Group",
              keywords: adGroupData.keywords || [],
              negativeKeywords: adGroupData.negativeKeywords || [],
              locations: adGroupData.locations || [],
              languages: adGroupData.languages || ["en"],
              ageRanges: adGroupData.ageRanges || [],
              genders: adGroupData.genders || []
            }
          });

          // Create ads for this ad group
          if (adGroupData.ads && adGroupData.ads.length > 0) {
            for (const adData of adGroupData.ads) {
              await tx.googleAdCreative.create({
                data: {
                  adGroupId: adGroup.id,
                  headline1: adData.headline1,
                  headline2: adData.headline2,
                  headline3: adData.headline3,
                  description: adData.description,
                  description2: adData.description2,
                  finalUrl: adData.finalUrl,
                  displayUrl: adData.displayUrl,
                  callToAction: adData.callToAction
                }
              });
            }
          }
        }
      }

      return newCampaign;
    });

    // Track engagement action
    await prisma.engagementAction.create({
      data: {
        orgId,
        type: "google_ad",
        personaId: personaId || null,
        payload: JSON.stringify({ campaignId: campaign.id, name }),
        status: "created"
      }
    });

    console.log(`✅ Google Ads campaign created: ${campaign.name} (${campaign.id})`);
    res.status(201).json(campaign);
  } catch (error) {
    console.error("❌ Error creating campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// GET /api/googleads/campaigns/:orgId - Get all campaigns for org
router.get("/:orgId", async (req, res) => {
  try {
    const { orgId } = req.params;

    const campaigns = await prisma.googleAdCampaign.findMany({
      where: { orgId },
      include: {
        persona: {
          select: {
            id: true,
            personaName: true
          }
        },
        googleAdAccount: {
          select: {
            id: true,
            displayName: true,
            status: true
          }
        },
        adGroups: {
          include: {
            ads: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(campaigns);
  } catch (error) {
    console.error("❌ Error fetching campaigns:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// GET /api/googleads/campaign/:id - Get single campaign with full details
router.get("/campaign/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.googleAdCampaign.findUnique({
      where: { id },
      include: {
        persona: true,
        googleAdAccount: true,
        adGroups: {
          include: {
            ads: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json(campaign);
  } catch (error) {
    console.error("❌ Error fetching campaign:", error);
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

// PATCH /api/googleads/campaign/:id - Update campaign
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, objective, dailyBudget, startDate, endDate, status } = req.body;

    const campaign = await prisma.googleAdCampaign.update({
      where: { id },
      data: {
        name,
        objective,
        dailyBudget: dailyBudget ? parseFloat(dailyBudget) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status
      }
    });

    console.log(`✅ Campaign updated: ${campaign.name} (${campaign.id})`);
    res.json(campaign);
  } catch (error) {
    console.error("❌ Error updating campaign:", error);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

// DELETE /api/googleads/campaign/:id - Delete campaign
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.query;

    // Verify ownership
    const campaign = await prisma.googleAdCampaign.findFirst({
      where: { id, orgId }
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Delete campaign (cascade will handle ad groups and ads)
    await prisma.googleAdCampaign.delete({
      where: { id }
    });

    console.log(`✅ Campaign deleted: ${id}`);
    res.json({ message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting campaign:", error);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

export default router;

