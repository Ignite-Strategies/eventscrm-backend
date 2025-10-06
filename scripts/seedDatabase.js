import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Step 1: Push schema to create all tables
  console.log('📊 Creating database tables...');
  console.log('   Run: npx prisma db push --accept-data-loss\n');
  
  // Step 2: Create hardcoded organization
  console.log('🏢 Creating F3 Capital organization...');
  
  // Check if org already exists
  const existingOrg = await prisma.organization.findFirst({
    where: { slug: 'f3-capital' }
  });

  let org;
  if (existingOrg) {
    console.log(`   ✅ Organization already exists: ${existingOrg.name} (ID: ${existingOrg.id})`);
    org = existingOrg;
  } else {
    org = await prisma.organization.create({
      data: {
        name: 'F3 Capital',
        slug: 'f3-capital',
        mission: 'Building better men through fitness, fellowship, and faith. Supporting our community through impactful events and service.',
        website: 'https://f3capital.com',
        x: 'https://x.com/f3capital',
        instagram: 'https://instagram.com/f3capital',
        facebook: 'https://facebook.com/f3capital',
        linkedin: 'https://linkedin.com/company/f3capital',
        street: '1600 Pennsylvania Avenue NW',
        city: 'Washington',
        state: 'DC',
        zip: '20500',
        pipelineDefaults: [
          'in_funnel',
          'general_awareness',
          'personal_invite',
          'expressed_interest',
          'soft_commit',
          'paid',
          'cant_attend'
        ]
      }
    });
    console.log(`✅ Organization created: ${org.name} (ID: ${org.id})`);
    
    // Create owner member
    const owner = await prisma.orgMember.create({
      data: {
        orgId: org.id,
        email: 'owner@f3capital.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'owner'
      }
    });
    console.log(`✅ Owner created: ${owner.email}`);
  }
  console.log('');

  // Step 3: Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Database seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📋 Summary:`);
  console.log(`   • Organization: ${org.name}`);
  console.log(`   • Org ID: ${org.id}`);
  console.log(`   • Slug: ${org.slug}`);
  console.log(`   • Pipeline Stages: ${org.pipelineDefaults.length}`);
  console.log(`\n🔗 Save this Org ID for your frontend .env:`);
  console.log(`   VITE_ORG_ID=${org.id}\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

