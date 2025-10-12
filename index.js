import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDatabase from './config/database.js';

// Import routes
import adminUserAuthRouter from './routes/adminUserAuthRoute.js';
import orgsRouter from './routes/orgsRoute.js';
import orgMembersSaverouter from './routes/orgMembersSaveroute.js';
import orgMembersHydraterouter from './routes/orgMembersHydrateRoute.js';
import eventsRouter from './routes/eventsRoute.js';
import eventAttendeeListRouter from './routes/eventAttendeeListRoute.js';
// import eventPipelinesRouter from './routes/eventPipelinesRoute.js'; // REMOVED - deprecated for now
// import eventPipelineActionsRouter from './routes/eventPipelineActionsRoute.js'; // REMOVED - duplicate of eventPipelinesRouter
import templatesRouter from './routes/templatesRoute.js';
import emailRouter from './routes/emailRoute.js';
import contactListsRouter from './routes/contactListsRoute.js';
import campaignRouter from './routes/campaignRoute.js';
import sequenceRouter from './routes/sequenceRoute.js';
import eventTasksRouter from './routes/eventTasksRoute.js';
import publicFormSubmissionRouter from './routes/publicFormSubmissionRoute.js';
import formDashHydratorRouter from './routes/formDashHydratorRoute.js';
import formCreatorSaverRouter from './routes/formCreatorSaverRoute.js';
import formsPublicHydrateRouter from './routes/formsPublicHydrateRoute.js';
import adminRouter from './routes/adminRoute.js';
import dashboardHydrationRouter from './routes/dashboardHydrationRoute.js';
import welcomeHydrationRouter from './routes/welcomeHydrationRoute.js';
import contactHydrateRouter from './routes/contactHydrateRoute.js';
import contactSaveRouter from './routes/contactSaveRoute.js';
import contactDeleteRouter from './routes/contactDeleteRoute.js';
import eventAttendeeDeleteRouter from './routes/eventAttendeeDeleteRoute.js';    // EventAttendee delete (fork-aware)
import orgMemberDeleteRouter from './routes/orgMemberDeleteRoute.js';    // OrgMember delete (fork-aware)
// import contactUploadRouter from './routes/contactUploadRoute.js';    // DELETED - Contact CSV upload - DEPRECATED
// import generalContactUploadRouter from './routes/generalContactUploadRoute.js';    // DELETED - General Contact preview
// import generalContactSaverRouter from './routes/generalContactSaverRoute.js';    // DELETED - General Contact save
import contactEventUploadRouter from './routes/contactEventUploadRoute.js';    // Event Contact upload
import pipelineHydrationRouter from './routes/pipelineHydrationRoute.js'; // NEW: EventAttendee-based pipeline (no EventPipeline model)
import eventAttendeesRouter from './routes/eventAttendeesRoute.js'; // NEW: Simple EventAttendees endpoint
import pipelineConfigRouter from './routes/pipelineConfigRoute.js'; // Pipeline config from database
import orgMemberCreateRouter from './routes/orgMemberCreateRoute.js'; // NEW: Create OrgMember from Contact

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
app.use('/api', orgMembersSaverouter);           // OrgMember CSV upload (Contact-First, no orgId in URL)
app.use('/api', orgMembersHydraterouter);        // OrgMember list/detail hydration
app.use('/api', orgMemberCreateRouter);          // Create OrgMember from existing Contact
app.use('/api/orgs', eventsRouter);             // Event creation nested under orgs
app.use('/api/events', eventsRouter);           // Event operations
app.use('/api/events', eventAttendeeListRouter); // Attendee list (paid/soft_commit) for attendance tracking
// app.use('/api/events', eventPipelinesRouter);   // REMOVED - Pipeline routes deprecated for now
// app.use('/api/events', eventPipelineActionsRouter); // REMOVED - duplicate functionality in eventPipelinesRouter
app.use('/api/templates', templatesRouter);     // Email templates
app.use('/api/email', emailRouter);             // Email sending
app.use('/api/contact-lists', contactListsRouter); // Contact lists
app.use('/api/campaigns', campaignRouter);      // Campaigns (bulk email)
app.use('/api/sequences', sequenceRouter);      // Sequences (individual emails in campaigns)
app.use('/api/events', eventTasksRouter);       // Event tasks
app.use('/api/contacts', publicFormSubmissionRouter); // Public form submission (external users)
app.use('/api/forms/public', formsPublicHydrateRouter); // Public form hydration (external users)
app.use('/api/forms', formDashHydratorRouter); // Form loading (CRM admin dashboard - list & edit)
app.use('/api/forms/saver', formCreatorSaverRouter);       // Form save/update/delete (CRM admin)
app.use('/api/admins', adminRouter);            // Admin operations
app.use('/api/hydration', dashboardHydrationRouter);     // Dashboard universal data load
app.use('/api/welcome', welcomeHydrationRouter);         // Simple welcome hydration (adminId, orgId, eventId)
app.use('/api/contacts', contactHydrateRouter);   // Contact hydration (GET)
app.use('/api/contacts', contactSaveRouter);      // Contact save (POST/PATCH)  
app.use('/api/contacts', contactDeleteRouter);    // Contact delete (DELETE)
app.use('/api/event-attendees', eventAttendeeDeleteRouter);    // EventAttendee delete (fork-aware)
app.use('/api/orgmembers', orgMemberDeleteRouter);    // OrgMember delete (fork-aware)
// app.use('/api/contacts', contactUploadRouter);    // DELETED - Contact CSV upload - DEPRECATED
// app.use('/api/contacts', generalContactUploadRouter);    // DELETED - General Contact preview
// app.use('/api/contacts', generalContactSaverRouter);    // DELETED - General Contact save
app.use('/api/contacts', contactEventUploadRouter);    // Event Contact upload
app.use('/api/events', pipelineHydrationRouter); // Pipeline hydration (EventAttendee-based, no EventPipeline model)
app.use('/api/events', eventAttendeesRouter); // Simple EventAttendees endpoint
app.use('/api/pipeline-config', pipelineConfigRouter); // Pipeline config from database

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

