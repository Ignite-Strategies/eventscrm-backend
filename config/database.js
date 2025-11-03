import { PrismaClient } from '@prisma/client';

/**
 * Database Configuration
 * 
 * RENDER ENVIRONMENT VARIABLE NAME: DATABASE_URL
 * ACTUAL POSTGRES DATABASE: ignite_crm
 * 
 * On Render, set:
 * DATABASE_URL = postgresql://user:pass@host:port/ignite_crm
 */

let prisma;

export async function connectDatabase() {
  try {
    prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ PostgreSQL connected via Prisma');
    console.log('📊 Database: ignite_crm');
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err.message || err);
    console.warn('⚠️  Server will start without database connection. Database operations will fail until connection is restored.');
    // Don't exit - allow server to start and retry connection later
    // The app will need the database to function, but at least it won't crash on startup
  }
}

export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export default connectDatabase;

