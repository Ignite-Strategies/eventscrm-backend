import mongoose from 'mongoose';

/**
 * Database Configuration
 * Connects to SUPPORTER_DB
 * 
 * RENDER ENVIRONMENT VARIABLE:
 * MONGO_URI = mongodb+srv://user:pass@cluster.mongodb.net/SUPPORTER_DB
 * (Connection string INCLUDES /SUPPORTER_DB at the end)
 */

export async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected to SUPPORTER_DB');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

export default connectDatabase;

