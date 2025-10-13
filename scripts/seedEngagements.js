import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function seedReferenceTable() {
  console.log('🌱 Seeding reference tables...');
  
  // Engagement levels (1-4)
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
  
  // Likelihood to Attend levels (1-4)
  const likelihoodLevels = [
    { value: 1 }, // High
    { value: 2 }, // Medium
    { value: 3 }, // Low
    { value: 4 }  // Support From Afar
  ];
  
  for (const likelihood of likelihoodLevels) {
    const existing = await prisma.likelihoodToAttend.findUnique({
      where: { value: likelihood.value }
    });
    
    if (existing) {
      console.log(`✅ LikelihoodToAttend value ${likelihood.value} already exists`);
    } else {
      await prisma.likelihoodToAttend.create({
        data: likelihood
      });
      console.log(`✅ Created LikelihoodToAttend value: ${likelihood.value}`);
    }
  }
  
  console.log('🎉 Reference tables seeding complete!');
  process.exit(0);
}

seedReferenceTable().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});

