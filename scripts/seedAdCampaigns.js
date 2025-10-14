/**
 * Seed Script for Ad Campaigns
 * 
 * Usage:
 * node scripts/seedAdCampaigns.js <orgId>
 * 
 * Example:
 * node scripts/seedAdCampaigns.js cm123xyz
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAdCampaigns(orgId) {
  console.log('🌱 Seeding ad campaigns for orgId:', orgId);

  const mockCampaigns = [
    {
      name: "Spring Fundraiser 2024",
      budget: 1500.00,
      landingPage: "https://example.com/spring-event",
      adText: "Join us for our annual Spring Fundraiser! Support a great cause while enjoying an evening of entertainment. Limited seats available - register now!",
      status: "Active",
      impressions: 12450,
      clicks: 342,
      spend: 487.50
    },
    {
      name: "Summer Gala Promotion",
      budget: 2000.00,
      landingPage: "https://example.com/summer-gala",
      adText: "An elegant evening under the stars! Our Summer Gala is the event of the season. Get your tickets before they sell out.",
      status: "Active",
      impressions: 8920,
      clicks: 198,
      spend: 312.75
    },
    {
      name: "Community Workshop Series",
      budget: 800.00,
      landingPage: "https://example.com/workshops",
      adText: "Free community workshops every Saturday! Learn new skills, meet neighbors, and grow together. All ages welcome.",
      status: "Paused",
      impressions: 5630,
      clicks: 156,
      spend: 203.40
    },
    {
      name: "Holiday Season Campaign",
      budget: 3000.00,
      landingPage: "https://example.com/holiday-event",
      adText: "Celebrate the season with us! Holiday festivities, family activities, and special performances. Don't miss this magical event!",
      status: "Draft",
      impressions: 0,
      clicks: 0,
      spend: 0.00
    },
    {
      name: "New Member Drive",
      budget: 1200.00,
      landingPage: "https://example.com/join-us",
      adText: "Become part of something bigger! Join our community today and make a difference. Special welcome benefits for new members.",
      status: "Active",
      impressions: 15780,
      clicks: 421,
      spend: 568.90
    }
  ];

  try {
    for (const campaign of mockCampaigns) {
      const created = await prisma.adCampaign.create({
        data: {
          orgId,
          ...campaign
        }
      });
      console.log(`✅ Created campaign: ${created.name} (${created.status})`);
    }

    console.log('\n🎉 Successfully seeded', mockCampaigns.length, 'ad campaigns!');
    
    // Display summary
    const summary = mockCampaigns.reduce((acc, c) => ({
      totalBudget: acc.totalBudget + c.budget,
      totalSpend: acc.totalSpend + c.spend,
      totalImpressions: acc.totalImpressions + c.impressions,
      totalClicks: acc.totalClicks + c.clicks
    }), { totalBudget: 0, totalSpend: 0, totalImpressions: 0, totalClicks: 0 });

    console.log('\n📊 Summary:');
    console.log(`   Total Budget: $${summary.totalBudget.toFixed(2)}`);
    console.log(`   Total Spend: $${summary.totalSpend.toFixed(2)}`);
    console.log(`   Total Impressions: ${summary.totalImpressions.toLocaleString()}`);
    console.log(`   Total Clicks: ${summary.totalClicks.toLocaleString()}`);
    console.log(`   Average CTR: ${((summary.totalClicks / summary.totalImpressions) * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('❌ Error seeding campaigns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get orgId from command line arguments
const orgId = process.argv[2];

if (!orgId) {
  console.error('❌ Error: Please provide an orgId');
  console.log('Usage: node scripts/seedAdCampaigns.js <orgId>');
  process.exit(1);
}

seedAdCampaigns(orgId);


