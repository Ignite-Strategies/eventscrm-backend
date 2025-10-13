import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * Seed LeadershipRole reference table
 * Values: 1=none, 2=project_lead, 3=committee, 4=board
 */
export async function seedLeadershipRoles() {
  try {
    console.log('🌱 Seeding LeadershipRole reference table...');

    const leadershipRoles = [
      { value: 1, name: 'None' },
      { value: 2, name: 'Project Lead' },
      { value: 3, name: 'Committee' },
      { value: 4, name: 'Board' }
    ];

    for (const role of leadershipRoles) {
      await prisma.leadershipRole.upsert({
        where: { value: role.value },
        update: { name: role.name },
        create: { value: role.value, name: role.name }
      });
      console.log(`✅ Seeded leadership role: ${role.value}=${role.name}`);
    }

    console.log('✅ LeadershipRole seeding completed');
  } catch (error) {
    console.error('❌ Error seeding leadership roles:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLeadershipRoles()
    .then(() => {
      console.log('🎉 LeadershipRole seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 LeadershipRole seeding failed:', error);
      process.exit(1);
    });
}
