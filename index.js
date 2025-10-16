import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import database connection
import { connectDatabase } from './config/database.js';

// Import all routes
import orgRouter from './routes/orgsRoute.js';
import eventRouter from './routes/eventsRoute.js';
import contactListRouter from './routes/contactListsRoute.js';
import campaignRouter from './routes/campaignRoute.js';
// import sequenceRouter from './routes/sequenceRoute.js'; // DEPRECATED
import templateRouter from './routes/templatesRoute.js';
import orgMemberFormRouter from './routes/orgMemberFormRoute.js';
import orgMembersHydrateRouter from './routes/orgMembersHydrateRoute.js';
import listHydrationRouter from './routes/listHydrationRoute.js'; // List + Campaign hydration
import eventAttendeeUpdateRouter from './routes/eventAttendeeUpdateRoute.js'; // UPDATE: EventAttendee updates
import eventAttendeesRouter from './routes/eventAttendeesRoute.js'; // GET EventAttendees
import pipelineConfigRouter from './routes/pipelineConfigRoute.js'; // Pipeline config from database
import orgMemberCreateRouter from './routes/orgMemberCreateRoute.js'; // NEW: Create OrgMember from Contact
import formResponsesRouter from './routes/formResponsesRoute.js'; // NEW: Form responses by event
import adsRouter from './routes/adsRoute.js'; // Ad Management (Google Ads integration)
import testEmailRouter from './routes/testEmailRoute.js'; // Test email sending (SendGrid testing)
// import enterpriseEmailRouter from './routes/enterpriseEmailRoute.js'; // DELETED - too confusing with Gmail // Enterprise email sending (SendGrid production)
import personalEmailRouter from './routes/personalEmailRoute.js'; // Personal email sending (Gmail OAuth)
import enterpriseGmailRouter from './routes/enterpriseGmailRoute.js'; // Enterprise Gmail sending (Gmail OAuth campaigns)
import welcomeHydrationRouter from './routes/welcomeHydrationRoute.js'; // Welcome hydration for Firebase users
import adminUserAuthRouter from './routes/adminUserAuthRoute.js'; // Admin/User authentication (Firebase)
import stageMovementRouter from './routes/stageMovementRoute.js'; // Stage movement automation
import googleAdsRouter from './routes/googleAdsRoute.js'; // Google Ads API integration
import fileUploadRouter from './routes/fileUploadRoute.js'; // File upload for campaign attachments
import metaRouter from './routes/metaRoute.js'; // Meta/Facebook Page management
import universalContactUploadRouter from './routes/universalContactUploadRoute.js'; // Universal CSV upload
import contactSaveRouter from './routes/contactSaveRoute.js'; // Contact creation/editing
import contactHydrateRouter from './routes/contactHydrateRoute.js'; // Contact detail hydration

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-id', 'x-org-id']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to database
connectDatabase().catch(console.error);

// Routes
app.use('/api/orgs', orgRouter);
app.use('/api/events', eventRouter);
app.use('/api/contact-lists', contactListRouter);
app.use('/api/campaigns', campaignRouter);
// app.use('/api/sequences', sequenceRouter); // DEPRECATED
app.use('/api/templates', templateRouter);
app.use('/api/org-member-form', orgMemberFormRouter);
app.use('/api/orgmembers', orgMembersHydrateRouter);  // ✅ Org Members Hydration
app.use('/api/list-hydration', listHydrationRouter);  // ✅ List + Campaign Hydration
app.use('/api/event-attendee-update', eventAttendeeUpdateRouter);
app.use('/api/events', eventAttendeesRouter); // GET /events/:eventId/attendees
app.use('/api/pipeline-config', pipelineConfigRouter);
app.use('/api/org-member-create', orgMemberCreateRouter);
app.use('/api/form-responses', formResponsesRouter);
app.use('/api/ads', adsRouter);
app.use('/api/test-email', testEmailRouter);
// app.use('/api/enterprise-email', enterpriseEmailRouter); // DELETED - too confusing with Gmail
app.use('/api/email/personal', personalEmailRouter);  // Personal email sending (Gmail OAuth)
app.use('/api/enterprise-gmail', enterpriseGmailRouter);  // Enterprise Gmail sending (Gmail OAuth campaigns)
app.use('/api/welcome', welcomeHydrationRouter);  // ✅ Welcome hydration (Firebase → Admin check)
app.use('/api/auth', adminUserAuthRouter);  // ✅ Admin authentication (findOrCreate)
app.use('/api/stage-movement', stageMovementRouter);  // ✅ Stage movement automation
app.use('/api/google-ads', googleAdsRouter);  // ✅ Google Ads API integration
app.use('/api/file-upload', fileUploadRouter);  // 📎 File upload for campaign attachments
app.use('/api/meta', metaRouter);  // ✅ Meta/Facebook Page management
app.use('/api/contacts/upload', universalContactUploadRouter);  // ✅ Universal CSV upload
app.use('/api/contacts', contactHydrateRouter);  // ✅ Contact detail hydration (GET /contacts/:id)
app.use('/api/contacts', contactSaveRouter);  // ✅ Contact creation/editing (POST /contacts)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Ignite Strategies CRM Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      orgs: '/api/orgs',
      events: '/api/events',
      contacts: '/api/contacts',
      orgMembers: '/api/orgmembers',
      eventAttendees: '/api/eventattendees',
      pipelines: '/api/pipelines',
      contactLists: '/api/contact-lists',
      campaigns: '/api/campaigns',
      sequences: '/api/sequences',
      templates: '/api/templates',
      forms: '/api/forms',
      formSubmissions: '/api/form-submissions',
      orgMemberForm: '/api/org-member-form',
      eventAttendeeUpdate: '/api/event-attendee-update',
      pipelineConfig: '/api/pipeline-config',
      orgMemberCreate: '/api/org-member-create',
      formResponses: '/api/form-responses',
      ads: '/api/ads',
      testEmail: '/api/test-email',
      enterpriseEmail: '/api/enterprise-email',
      personalEmail: '/api/email/personal'
    }
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