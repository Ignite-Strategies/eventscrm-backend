import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function seedEngagements() {
  console.log('🌱 Seeding Engagement levels...');
  
  const engagementLevels = [
    { value: 1 }, // Undetermined
    { value: 2 }, // Low
    { value: 3 }, // Medium
    { value: 4 }  // High
  ];
  
  for (const engagement of engagementLevels) {
    const existing = await prisma.engagement.findUnique({
      where: { value: engagement.value }
    });
    
    if (existing) {
      console.log(`✅ Engagement value ${engagement.value} already exists`);
    } else {
      await prisma.engagement.create({
        data: engagement
      });
      console.log(`✅ Created engagement value: ${engagement.value}`);
    }
  }
  
  console.log('🎉 Engagement seeding complete!');
  process.exit(0);
}

seedEngagements().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});

