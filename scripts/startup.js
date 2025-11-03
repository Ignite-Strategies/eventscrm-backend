import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Startup script for Render deployment
 * Runs migrations and seeding before starting the server
 */
async function startup() {
  try {
    console.log('📦 Starting application setup...\n');

    // Step 1: Pre-migration fix
    try {
      console.log('🔧 Running pre-migration fix...');
      execSync('node scripts/pre-migration-fix.js', { cwd: projectRoot, stdio: 'inherit' });
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
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

startup();
