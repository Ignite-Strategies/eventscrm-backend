import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Checking database status...\n');

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');

    // Check for organizations
    console.log('🏢 Organizations:');
    const orgs = await prisma.organization.findMany();
    if (orgs.length === 0) {
      console.log('   ⚠️  No organizations found. Run: npm run db:seed\n');
    } else {
      orgs.forEach(org => {
        console.log(`   ✅ ${org.name} (${org.slug})`);
        console.log(`      ID: ${org.id}`);
      });
      console.log('');
    }

    // Check for events
    console.log('📅 Events:');
    const events = await prisma.event.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    if (events.length === 0) {
      console.log('   No events yet.\n');
    } else {
      events.forEach(event => {
        console.log(`   • ${event.name} (${event.date || 'No date'})`);
      });
      console.log('');
    }

    // Check for supporters
    console.log('👥 Supporters:');
    const supporters = await prisma.supporter.count();
    console.log(`   Total: ${supporters}\n`);

    // Check for tasks
    console.log('✅ Tasks:');
    const tasks = await prisma.eventTask.count();
    console.log(`   Total: ${tasks}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database check complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Database error:', error.message);
    
    if (error.code === 'P2021') {
      console.log('\n⚠️  Tables not created yet!');
      console.log('   Run: npx prisma db push --accept-data-loss\n');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

