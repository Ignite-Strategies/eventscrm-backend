import mongoose from 'mongoose';

/**
 * Database Configuration
 * Connects to SUPPORTER_DB
 * 
 * RENDER ENVIRONMENT VARIABLE:
 * MONGO_URI = your MongoDB Atlas connection string (without database name)
 * Example: mongodb+srv://user:pass@cluster.mongodb.net
 */

export async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "SUPPORTER_DB"  // 👈 Database name specified here
    });
    console.log('✅ MongoDB connected to SUPPORTER_DB');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

export default connectDatabase;

