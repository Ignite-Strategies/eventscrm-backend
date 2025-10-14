import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create a new ad campaign
 */
export const createAdCampaign = async (orgId, campaignData) => {
  const { name, budget, landingPage, adText } = campaignData;

  const campaign = await prisma.adCampaign.create({
    data: {
      orgId,
      name,
      budget: parseFloat(budget),
      landingPage,
      adText,
      status: 'Draft'
    }
  });

  return campaign;
};

/**
 * Get all ad campaigns for an organization
 */
export const getAdCampaigns = async (orgId) => {
  const campaigns = await prisma.adCampaign.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' }
  });

  return campaigns;
};

/**
 * Get summary metrics for ad campaigns
 */
export const getAdSummary = async (orgId) => {
  const campaigns = await prisma.adCampaign.findMany({
    where: { orgId }
  });

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'Active');
  
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);

  // Calculate CTR (Click-Through Rate)
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;

  // Calculate Average CPC (Cost Per Click)
  const avgCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 0;

  return {
    totalCampaigns,
    activeSpend: totalSpend.toFixed(2),
    ctr: `${ctr}%`,
    conversions: 0, // Placeholder for now
    avgCpc: `$${avgCpc}`
  };
};

/**
 * Update ad campaign metrics (impressions, clicks, spend)
 */
export const updateAdMetrics = async (campaignId, metrics) => {
  const campaign = await prisma.adCampaign.update({
    where: { id: campaignId },
    data: {
      impressions: metrics.impressions || 0,
      clicks: metrics.clicks || 0,
      spend: metrics.spend || 0
    }
  });

  return campaign;
};

/**
 * Update ad campaign status
 */
export const updateAdStatus = async (campaignId, status) => {
  const campaign = await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status }
  });

  return campaign;
};

/**
 * Get a single ad campaign by ID
 */
export const getAdCampaignById = async (campaignId) => {
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId }
  });

  return campaign;
};

/**
 * Delete an ad campaign
 */
export const deleteAdCampaign = async (campaignId) => {
  await prisma.adCampaign.delete({
    where: { id: campaignId }
  });

  return { success: true };
};


