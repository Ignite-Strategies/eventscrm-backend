import { getPrismaClient } from './config/database.js';

const prisma = getPrismaClient();

async function checkAdmins() {
  try {
    console.log('🔍 Checking Admin records...\n');
    
    const admins = await prisma.admin.findMany({
      include: {
        org: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📊 Found ${admins.length} admin(s):\n`);
    
    admins.forEach((admin, index) => {
      console.log(`\n━━━ Admin ${index + 1} ━━━`);
      console.log(`ID:         ${admin.id}`);
      console.log(`Firebase:   ${admin.firebaseId || 'NOT SET'}`);
      console.log(`Email:      ${admin.email || 'NOT SET'}`);
      console.log(`Name:       ${admin.firstName || '?'} ${admin.lastName || '?'}`);
      console.log(`Phone:      ${admin.phone || 'NOT SET'}`);
      console.log(`Role:       ${admin.role}`);
      console.log(`Status:     ${admin.status}`);
      console.log(`Org:        ${admin.org?.name || 'NO ORG'} (${admin.orgId || 'null'})`);
      console.log(`Created:    ${admin.createdAt}`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmins();

