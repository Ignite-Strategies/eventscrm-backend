import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDatabase from './config/database.js';

// Import routes
import adminUserAuthRouter from './routes/adminUserAuthRoute.js';
import orgsRouter from './routes/orgsRoute.js';
import orgMembersListRouter from './routes/orgMembersListRoute.js';
import eventsRouter from './routes/eventsRoute.js';
import eventAttendeeListRouter from './routes/eventAttendeeListRoute.js';
// import eventPipelinesRouter from './routes/eventPipelinesRoute.js'; // REMOVED - deprecated for now
// import eventPipelineActionsRouter from './routes/eventPipelineActionsRoute.js'; // REMOVED - duplicate of eventPipelinesRouter
import templatesRouter from './routes/templatesRoute.js';
import emailRouter from './routes/emailRoute.js';
import contactListsRouter from './routes/contactListsRoute.js';
import eventTasksRouter from './routes/eventTasksRoute.js';
import publicFormSubmissionRouter from './routes/publicFormSubmissionRoute.js';
import formDashHydratorRouter from './routes/formDashHydratorRoute.js';
import formCreatorSaverRouter from './routes/formCreatorSaverRoute.js';
import formsPublicHydrateRouter from './routes/formsPublicHydrateRoute.js';
import adminRouter from './routes/adminRoute.js';
import dashboardHydrationRouter from './routes/dashboardHydrationRoute.js';
import contactHydrateRouter from './routes/contactHydrateRoute.js';
import contactSaveRouter from './routes/contactSaveRoute.js';
import contactDeleteRouter from './routes/contactDeleteRoute.js';
// import stageRouter from './routes/stageRoute.js'; // TODO: Create this route
import pipelineHydrationRouter from './routes/pipelineHydrationRoute.js'; // NEW: EventAttendee-based pipeline (no EventPipeline model)

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-id']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
await connectDatabase();

// Routes
app.use('/api/auth', adminUserAuthRouter);      // Admin user auth (OrgMember mirage - may refactor later)
app.use('/api/orgs', orgsRouter);
app.use('/api/orgs', orgMembersListRouter);     // List/CSV upload
app.use('/api', orgMembersListRouter);          // Delete route not nested
app.use('/api/orgs', eventsRouter);             // Event creation nested under orgs
app.use('/api/events', eventsRouter);           // Event operations
app.use('/api/events', eventAttendeeListRouter); // Attendee list (paid/soft_commit) for attendance tracking
// app.use('/api/events', eventPipelinesRouter);   // REMOVED - Pipeline routes deprecated for now
// app.use('/api/events', eventPipelineActionsRouter); // REMOVED - duplicate functionality in eventPipelinesRouter
app.use('/api/templates', templatesRouter);     // Email templates
app.use('/api/email', emailRouter);             // Email sending
app.use('/api/contact-lists', contactListsRouter); // Contact lists
app.use('/api/events', eventTasksRouter);       // Event tasks
app.use('/api/contacts', publicFormSubmissionRouter); // Public form submission (external users)
app.use('/api/forms/public', formsPublicHydrateRouter); // Public form hydration (external users)
app.use('/api/forms', formDashHydratorRouter); // Form loading (CRM admin dashboard - list & edit)
app.use('/api/forms/saver', formCreatorSaverRouter);       // Form save/update/delete (CRM admin)
app.use('/api/admins', adminRouter);            // Admin operations
app.use('/api/hydration', dashboardHydrationRouter);     // Dashboard universal data load
app.use('/api/contacts', contactHydrateRouter);   // Contact hydration (GET)
app.use('/api/contacts', contactSaveRouter);      // Contact save (POST/PATCH)  
app.use('/api/contacts', contactDeleteRouter);    // Contact delete (DELETE)
app.use('/api/events', pipelineHydrationRouter); // Pipeline hydration (EventAttendee-based, no EventPipeline model)
// app.use('/api', stageRouter);                   // Stage definitions (hydrated from database) // TODO: Create this route

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

