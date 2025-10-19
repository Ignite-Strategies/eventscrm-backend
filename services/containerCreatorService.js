import { getPrismaClient } from '../config/database.js';
import { customAlphabet } from 'nanoid';

const prisma = getPrismaClient();
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

/**
 * Create a new unique Container
 * Each signup creates a fresh container for isolation
 * 
 * @param {string} baseName - Base name for container (e.g., org name)
 * @returns {Promise<Container>} The created container
 */
async function createUniqueContainer(baseName = 'New Organization') {
  try {
    const uniqueSlug = `container-${nanoid()}`;
    
    const container = await prisma.container.create({
      data: {
        name: baseName,
        slug: uniqueSlug,
        description: `Container for ${baseName}`
      }
    });
    
    console.log('✅ Container created:', container.id, container.slug);
    return container;
    
  } catch (error) {
    console.error('❌ Container creation failed:', error);
    throw error;
  }
}

/**
 * Get or create default F3 container (MVP only)
 * Future: Remove this and always create unique containers
 */
async function getOrCreateF3Container() {
  try {
    let container = await prisma.container.findFirst({
      where: { slug: 'f3-default' }
    });
    
    if (!container) {
      console.log('📝 Creating default F3 container');
      container = await prisma.container.create({
        data: {
          name: 'F3',
          slug: 'f3-default',
          description: 'F3 fitness and leadership organization'
        }
      });
    }
    
    return container;
    
  } catch (error) {
    console.error('❌ F3 container error:', error);
    throw error;
  }
}

export { createUniqueContainer, getOrCreateF3Container };

