import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Step 1: Push schema to create all tables
  console.log('📊 Creating database tables...');
  console.log('   Run: npx prisma db push --accept-data-loss\n');
  
  // Step 2: Create hardcoded organization
  console.log('🏢 Creating Ignite Strategies organization...');
  
  const org = await prisma.organization.upsert({
    where: { 
      slug: 'ignite-strategies'
    },
    update: {},
    create: {
      name: 'Ignite Strategies',
      slug: 'ignite-strategies',
      pipelineDefaults: [
        'in_funnel',
        'general_awareness',
        'personal_invite',
        'expressed_interest',
        'soft_commit',
        'paid',
        'cant_attend'
      ],
      tagCategories: ['VIP', 'Committee', 'Volunteer', 'Donor', 'Board'],
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || ''
    }
  });

  console.log(`✅ Organization created: ${org.name} (ID: ${org.id})\n`);

  // Step 3: Create admin user (optional)
  console.log('👤 Creating admin user...');
  
  const admin = await prisma.adminUser.upsert({
    where: {
      email: 'admin@ignitestrategies.com'
    },
    update: {},
    create: {
      orgId: org.id,
      email: 'admin@ignitestrategies.com',
      firebaseUid: 'admin-placeholder',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User'
    }
  });

  console.log(`✅ Admin user created: ${admin.email}\n`);

  // Step 4: Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Database seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📋 Summary:`);
  console.log(`   • Organization: ${org.name}`);
  console.log(`   • Org ID: ${org.id}`);
  console.log(`   • Slug: ${org.slug}`);
  console.log(`   • Admin: ${admin.email}`);
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

