import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConfigs() {
  try {
    await prisma.$connect();
    const configs = await prisma.pipelineEventConfig.findMany();
    console.log('📊 PipelineEventConfig records in database:');
    console.log(JSON.stringify(configs, null, 2));
    console.log(`\n✅ Total records: ${configs.length}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkConfigs();

