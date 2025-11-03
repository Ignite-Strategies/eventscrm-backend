import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Test database connection with retries
 */
async function testDatabaseConnection(maxRetries = 5, delayMs = 2000) {
  console.log('🔍 Testing database connection...');
  console.log(`📊 DATABASE_URL: ${process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET ❌'}`);
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set!');
  }

  // Extract host from DATABASE_URL for display (without password)
  const dbUrl = process.env.DATABASE_URL;
  const hostMatch = dbUrl.match(/@([^:]+):/);
  const host = hostMatch ? hostMatch[1] : 'unknown';
  console.log(`🌐 Database host: ${host}`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔄 Attempt ${i + 1}/${maxRetries}...`);
      execSync('npx prisma db execute --stdin', {
        cwd: projectRoot,
        input: 'SELECT 1;',
        stdio: 'pipe'
      });
      console.log('✅ Database connection successful!');
      return true;
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error(`❌ Database connection failed after ${maxRetries} attempts`);
        throw error;
      }
      console.log(`⏳ Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Startup script for Render deployment
 * Runs migrations and seeding before starting the server
 */
async function startup() {
  try {
    console.log('📦 Starting application setup...\n');

    // Step 0: Test database connection first
    try {
      await testDatabaseConnection();
      console.log('');
    } catch (error) {
      console.error('\n❌ CRITICAL: Cannot connect to database!');
      console.error('💡 Possible issues:');
      console.error('   1. Database service is paused/stopped on Render');
      console.error('   2. DATABASE_URL environment variable is incorrect');
      console.error('   3. Database service is still starting up (wait 30-60 seconds)');
      console.error('   4. Network/firewall issue');
      console.error('\n🔧 Actions to try:');
      console.error('   - Check Render dashboard: Is the database service running?');
      console.error('   - Verify DATABASE_URL in Render environment variables');
      console.error('   - Wait a few minutes and try again');
      throw error;
    }

    // Step 1: Pre-migration fix
    try {
      console.log('🔧 Running pre-migration fix...');
      execSync('node scripts/pre-migration-fix.js', { cwd: projectRoot, stdio: 'inherit' });
      console.log('✅ Pre-migration fix completed');
    } catch (error) {
      console.warn('⚠️  Pre-migration fix failed (may be OK):', error.message);
    }

    // Step 2: Push database schema
    try {
      console.log('🗄️  Pushing database schema...');
      execSync('npx prisma db push --accept-data-loss', { cwd: projectRoot, stdio: 'inherit' });
      console.log('✅ Database schema pushed');
    } catch (error) {
      console.error('❌ Database push failed:', error.message);
      throw error; // Fail if schema push fails
    }

    // Step 3: Seed engagement data
    try {
      console.log('🌱 Seeding engagement data...');
      execSync('npm run db:seed-engagement', { cwd: projectRoot, stdio: 'inherit' });
      console.log('✅ Engagement data seeded');
    } catch (error) {
      console.warn('⚠️  Engagement seeding failed (may be OK):', error.message);
    }

    // Step 4: Seed leadership data
    try {
      console.log('🌱 Seeding leadership data...');
      execSync('npm run db:seed-leadership', { cwd: projectRoot, stdio: 'inherit' });
      console.log('✅ Leadership data seeded');
    } catch (error) {
      console.warn('⚠️  Leadership seeding failed (may be OK):', error.message);
    }

    // Step 5: Seed container
    try {
      console.log('🌱 Seeding container...');
      execSync('node scripts/seed-container.js', { cwd: projectRoot, stdio: 'inherit' });
      console.log('✅ Container seeded');
    } catch (error) {
      console.warn('⚠️  Container seeding failed (may be OK):', error.message);
    }

    console.log('\n✅ Setup complete! Starting server...\n');

    // Step 6: Start the server
    execSync('node index.js', { cwd: projectRoot, stdio: 'inherit' });

  } catch (error) {
    console.error('\n❌ Startup failed:', error.message);
    console.error('\n📋 Summary:');
    console.error('   The application failed to start during the setup phase.');
    console.error('   Check the errors above for specific issues.');
    process.exit(1);
  }
}

startup();
