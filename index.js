import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import orgsRouter from './routes/orgs.js';
import contactsRouter from './routes/contacts.js';
import eventsRouter from './routes/events.js';
import membershipsRouter from './routes/memberships.js';
import webhooksRouter from './routes/webhooks.js';
import eventPipelineRouter from './routes/eventPipeline.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/SUPPORTER_DB')
  .then(() => console.log('✅ MongoDB connected to SUPPORTER_DB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/orgs', orgsRouter);
app.use('/api/orgs', contactsRouter); // Nested under orgs
app.use('/api/orgs', eventsRouter);   // Event creation nested under orgs
app.use('/api/events', eventsRouter); // Event operations
app.use('/api/events', membershipsRouter);
app.use('/api/events', eventPipelineRouter); // Pipeline push operations
app.use('/api/memberships', membershipsRouter);
app.use('/api/webhooks', webhooksRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 CRM Backend running on port ${PORT}`);
});

