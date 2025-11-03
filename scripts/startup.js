import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Keep reference for server process
let serverProcess = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Startup script for Render deployment
 * Runs migrations and seeding before starting the server
 */
async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      ...options,
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function startup() {
  try {
    console.log('📦 Starting application setup...\n');

    // Step 1: Pre-migration fix (handles connection failures gracefully)
    try {
      await runCommand('node', ['scripts/pre-migration-fix.js']);
    } catch (error) {
      console.warn('⚠️  Pre-migration fix skipped or failed (may be OK):', error.message);
    }

    // Step 2: Push database schema
    try {
      await runCommand('npx', ['prisma', 'db', 'push', '--accept-data-loss']);
      console.log('✅ Database schema pushed');
    } catch (error) {
      console.error('❌ Database push failed:', error.message);
      // Continue anyway - might be a connection issue
    }

    // Step 3: Seed engagement data
    try {
      await runCommand('npm', ['run', 'db:seed-engagement']);
      console.log('✅ Engagement data seeded');
    } catch (error) {
      console.warn('⚠️  Engagement seeding failed (may be OK):', error.message);
    }

    // Step 4: Seed leadership data
    try {
      await runCommand('npm', ['run', 'db:seed-leadership']);
      console.log('✅ Leadership data seeded');
    } catch (error) {
      console.warn('⚠️  Leadership seeding failed (may be OK):', error.message);
    }

    // Step 5: Seed container
    try {
      await runCommand('node', ['scripts/seed-container.js']);
      console.log('✅ Container seeded');
    } catch (error) {
      console.warn('⚠️  Container seeding failed (may be OK):', error.message);
    }

    console.log('\n✅ Setup complete! Starting server...\n');

    // Step 6: Start the server (this will run indefinitely)
    // Don't await - let it run in the background
    const serverProcess = spawn('node', ['index.js'], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true
    });

    // Handle server process events
    serverProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`\n❌ Server exited with code ${code}`);
        console.log('💡 Tip: If this is due to database connection, resume the database service and restart the app.');
      }
      process.exit(code || 1);
    });

    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

startup();

