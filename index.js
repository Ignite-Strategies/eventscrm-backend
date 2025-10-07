import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDatabase from './config/database.js';

// Import routes
import authRouter from './routes/authRoute.js';
import orgsRouter from './routes/orgsRoute.js';
import orgMembersRouter from './routes/orgMembersRoute.js';
import supportersRouter from './routes/supportersRoute.js';
import eventsRouter from './routes/eventsRoute.js';
import eventPipelinesRouter from './routes/eventPipelinesRoute.js';
import eventAttendeesRouter from './routes/eventAttendeesRoute.js';
import eventPipelineActionsRouter from './routes/eventPipelineActionsRoute.js';
import webhooksRouter from './routes/webhooksRoute.js';
import templatesRouter from './routes/templatesRoute.js';
import emailRouter from './routes/emailRoute.js';
import contactListsRouter from './routes/contactListsRoute.js';
import eventTasksRouter from './routes/eventTasksRoute.js';
import publicFormsRouter from './routes/publicFormsRoute.js';
import formsRouter from './routes/formsRoute.js';
// import pipelineRouter from './routes/pipelineRoute.js'; // TODO: Create this route

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
await connectDatabase();

// Routes
app.use('/api/auth', authRouter);               // Firebase auth (findOrCreate)
app.use('/api/orgs', orgsRouter);
app.use('/api/org-members', orgMembersRouter);  // OrgMember CRUD
app.use('/api/orgs', supportersRouter);         // Contact CSV upload
app.use('/api', supportersRouter);              // Delete route not nested
app.use('/api/orgs', eventsRouter);             // Event creation nested under orgs
app.use('/api/events', eventsRouter);           // Event operations
app.use('/api/events', eventPipelinesRouter);   // Pipeline records (GET/PATCH/PUSH)
app.use('/api/events', eventAttendeesRouter);   // Final attendees
app.use('/api/events', eventPipelineActionsRouter); // Push actions
app.use('/api/webhooks', webhooksRouter);
app.use('/api/templates', templatesRouter);     // Email templates
app.use('/api/email', emailRouter);             // Email sending
app.use('/api/contact-lists', contactListsRouter); // Contact lists
app.use('/api/events', eventTasksRouter);       // Event tasks
app.use('/api/public', publicFormsRouter);      // Public landing page forms (no auth)
app.use('/api/forms', formsRouter);             // Form CRUD (authenticated)
// app.use('/api', pipelineRouter);                 // Pipeline management (7-stage system) // TODO: Create this route

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

