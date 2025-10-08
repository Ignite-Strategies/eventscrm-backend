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
// import eventPipelinesRouter from './routes/eventPipelinesRoute.js'; // REMOVED - deprecated for now
import eventAttendeesRouter from './routes/eventAttendeesRoute.js';
// import eventPipelineActionsRouter from './routes/eventPipelineActionsRoute.js'; // REMOVED - duplicate of eventPipelinesRouter
import webhooksRouter from './routes/webhooksRoute.js';
import templatesRouter from './routes/templatesRoute.js';
import emailRouter from './routes/emailRoute.js';
import contactListsRouter from './routes/contactListsRoute.js';
import eventTasksRouter from './routes/eventTasksRoute.js';
import formSubmissionRouter from './routes/formSubmissionRoute.js';
import formsRouter from './routes/formsRoute.js';
import adminRouter from './routes/adminRoute.js';
import hydrationRouter from './routes/hydrationRoute.js';
// import stageRouter from './routes/stageRoute.js'; // TODO: Create this route
// import pipelineHydrationRouter from './routes/pipelineHydrationRoute.js'; // TODO: Create this route
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
// app.use('/api/events', eventPipelinesRouter);   // REMOVED - Pipeline routes deprecated for now
app.use('/api/events', eventAttendeesRouter);   // Final attendees
// app.use('/api/events', eventPipelineActionsRouter); // REMOVED - duplicate functionality in eventPipelinesRouter
app.use('/api/webhooks', webhooksRouter);
app.use('/api/templates', templatesRouter);     // Email templates
app.use('/api/email', emailRouter);             // Email sending
app.use('/api/contact-lists', contactListsRouter); // Contact lists
app.use('/api/events', eventTasksRouter);       // Event tasks
app.use('/api/public', formSubmissionRouter);   // Form submissions (no auth) - generic endpoint that reads form config!
app.use('/api/forms', formsRouter);             // Form CRUD (authenticated)
app.use('/api/admins', adminRouter);            // Admin operations
app.use('/api/hydration', hydrationRouter);     // Universal hydration
// app.use('/api', stageRouter);                   // Stage definitions (hydrated from database) // TODO: Create this route
// app.use('/api', pipelineHydrationRouter);       // Pipeline hydration (stages + attendees) // TODO: Create this route
// app.use('/api', pipelineRouter);                 // Pipeline management (7-stage system) // TODO: Create this route

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.1' // Force new deploy
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 CRM Backend running on port ${PORT}`);
});

