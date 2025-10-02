import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDatabase from './config/database.js';

// Import routes
import orgsRouter from './routes/orgs.js';
import supportersRouter from './routes/supporters.js';
import eventsRouter from './routes/events.js';
import eventPipelinesRouter from './routes/eventPipelines.js';
import eventAttendeesRouter from './routes/eventAttendees.js';
import eventPipelineActionsRouter from './routes/eventPipeline.js'; // Push actions
import webhooksRouter from './routes/webhooks.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
await connectDatabase();

// Routes
app.use('/api/orgs', orgsRouter);
app.use('/api/orgs', supportersRouter);         // Supporters nested under orgs
app.use('/api/orgs', eventsRouter);             // Event creation nested under orgs
app.use('/api/events', eventsRouter);           // Event operations
app.use('/api/events', eventPipelinesRouter);   // Pipeline records (GET/PATCH)
app.use('/api/events', eventAttendeesRouter);   // Final attendees
app.use('/api/events', eventPipelineActionsRouter); // Push actions
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

