import mongoose from 'mongoose';

/**
 * Database Configuration
 * 
 * RENDER ENVIRONMENT VARIABLE NAME: SUPPORTER_DB
 * ACTUAL MONGODB DATABASE: impact_events
 * 
 * On Render, set:
 * SUPPORTER_DB = mongodb+srv://user:pass@cluster.mongodb.net/impact_events
 */

export async function connectDatabase() {
  try {
    await mongoose.connect(process.env.SUPPORTER_DB);
    console.log('✅ MongoDB connected');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

export default connectDatabase;

