import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import database connection
import { connectDatabase } from './config/database.js';
import seedContainer from './scripts/seed-container.js';

// Import all routes
import orgRouter from './routes/orgsRoute.js';
import eventRouter from './routes/eventsRoute.js';
import contactListRouter from './routes/contactListsRoute.js';
import campaignRouter from './routes/campaignRoute.js';
// import sequenceRouter from './routes/sequenceRoute.js'; // DEPRECATED
import templateRouter from './routes/templatesRoute.js';
// DELETED - Legacy OrgMember routes (Contact-first architecture now)
// import orgMemberFormRouter from './routes/orgMemberFormRoute.js';
// import orgMembersHydrateRouter from './routes/orgMembersHydrateRoute.js';
// import orgMemberCreateRouter from './routes/orgMemberCreateRoute.js';
import listHydrationRouter from './routes/listHydrationRoute.js'; // List + Campaign hydration
import pipelineConfigRouter from './routes/pipelineConfigRoute.js'; // Pipeline config from database
import formResponsesRouter from './routes/formResponsesRoute.js'; // NEW: Form responses by event
import formCreatorSaverRouter from './routes/formCreatorSaverRoute.js'; // Form creation and management
import formDashHydratorRouter from './routes/formDashHydratorRoute.js'; // Form listing and hydration
import adsRouter from './routes/adsRoute.js'; // Ad Management (Google Ads integration)
import testEmailRouter from './routes/testEmailRoute.js'; // Test email sending (SendGrid testing)
// import enterpriseEmailRouter from './routes/enterpriseEmailRoute.js'; // DELETED - too confusing with Gmail // Enterprise email sending (SendGrid production)
import personalEmailRouter from './routes/personalEmailRoute.js'; // Personal email sending (Gmail OAuth)
import enterpriseGmailRouter from './routes/enterpriseGmailRoute.js'; // Enterprise Gmail sending (Gmail OAuth campaigns)
import adminReturnGatekeeperRouter from './routes/adminReturnGatekeeperRoute.js'; // Admin gatekeeper - checks status and hydrates data
import adminUserAuthRouter from './routes/adminUserAuthRoute.js'; // Admin/User authentication (Firebase)
import adminRouter from './routes/adminRoute.js'; // Admin CRUD (profile updates, team management)
import stageMovementRouter from './routes/stageMovementRoute.js'; // Stage movement automation
import googleAdsRouter from './routes/googleAdsRoute.js'; // Google Ads API integration
import fileUploadRouter from './routes/fileUploadRoute.js'; // File upload for campaign attachments
import metaRouter from './routes/metaRoute.js'; // Meta/Facebook Page management
import universalContactUploadRouter from './routes/universalContactUploadRoute.js'; // Universal CSV upload
import contactUnifiedRouter from './routes/contactUnifiedRoute.js'; // 🔥 UNIFIED CONTACT API - Everything Contact!
import universalListRouter from './routes/universalListRoute.js'; // Universal list building
import formsPublicHydrateRouter from './routes/formsPublicHydrateRoute.js'; // Public forms for external display
import contactFormSubmitRouter from './routes/contactFormSubmitRoute.js'; // 📝 Public form submissions
import personasRouter from './routes/personasRoute.js'; // 🧩 THE HUMAN STACK - Personas
import googleAdsOAuthRouter from './routes/googleAdsOAuthRoute.js'; // 🔑 Google Ads OAuth
import googleAdsCampaignRouter from './routes/googleAdsCampaignRoute.js'; // 📊 Google Ads Campaigns
import memberJourneyRouter from './routes/memberJourneyRoute.js'; // 🗺️ Member Journey (6-stage lifecycle)
import youtubeOAuthRouter from './routes/youtubeOAuthRoute.js'; // 🔐 YouTube OAuth
import youtubeChannelRouter from './routes/youtubeChannelRoute.js'; // 📺 YouTube Channel
import youtubePlaylistsRouter from './routes/youtubePlaylistsRoute.js'; // 📋 YouTube Playlists
import youtubeUploadRouter from './routes/youtubeUploadRoute.js'; // 🎬 YouTube Upload
import gmailOAuthRouter from './routes/gmailOAuthRoute.js'; // 📧 Gmail OAuth (persistent tokens!)
import engageHydrateRouter from './routes/engageHydrateRoute.js'; // 💧 Engage Hydration

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
// DELETED - Legacy OrgMember routes
// app.use('/api/org-member-form', orgMemberFormRouter);
// app.use('/api/orgmembers', orgMembersHydrateRouter);
// app.use('/api/org-member-create', orgMemberCreateRouter);
app.use('/api/list-hydration', listHydrationRouter);  // ✅ List + Campaign Hydration
app.use('/api/pipeline-config', pipelineConfigRouter);
app.use('/api/form-responses', formResponsesRouter);
app.use('/api/forms/saver', formCreatorSaverRouter);  // ✅ Form creation and management (POST/PATCH/DELETE)
app.use('/api/forms', formDashHydratorRouter);  // ✅ Form listing and hydration (GET)
app.use('/api/ads', adsRouter);
app.use('/api/test-email', testEmailRouter);
// app.use('/api/enterprise-email', enterpriseEmailRouter); // DELETED - too confusing with Gmail
app.use('/api/email/personal', personalEmailRouter);  // Personal email sending (Gmail OAuth)
app.use('/api/enterprise-gmail', enterpriseGmailRouter);  // Enterprise Gmail sending (Gmail OAuth campaigns)
app.use('/api/welcome', adminReturnGatekeeperRouter);  // ✅ Admin gatekeeper - checks containerId/orgId and returns full data
app.use('/api/auth', adminUserAuthRouter);  // ✅ Admin authentication (findOrCreate)
app.use('/api/admin', adminRouter);  // ✅ Admin CRUD (GET, POST, PATCH, DELETE)
app.use('/api/stage-movement', stageMovementRouter);  // ✅ Stage movement automation
app.use('/api/google-ads', googleAdsRouter);  // ✅ Google Ads API integration
app.use('/api/file-upload', fileUploadRouter);  // 📎 File upload for campaign attachments
app.use('/api/meta', metaRouter);  // ✅ Meta/Facebook Page management
app.use('/api/contacts/upload', universalContactUploadRouter);  // ✅ Universal CSV upload
app.use('/api/contacts', contactUnifiedRouter);  // 🔥 UNIFIED CONTACT API - Query, Get, Create, Update, Delete (NO orgId required!)
app.use('/api/lists', universalListRouter);  // ✅ Universal list building
app.use('/api/forms/public', formsPublicHydrateRouter);  // ✅ Public forms for external display (GET /api/forms/public/:slug)
app.use('/api/forms', contactFormSubmitRouter);  // 📝 Public form submissions (POST /api/forms/submit)
app.use('/api/personas', personasRouter);  // 🧩 THE HUMAN STACK - Personas
app.use('/api/googleads', googleAdsOAuthRouter);  // 🔑 Google Ads OAuth
app.use('/api/googleads/campaigns', googleAdsCampaignRouter);  // 📊 Google Ads Campaigns
app.use('/api/member-journey', memberJourneyRouter);  // 🗺️ Member Journey (6-stage lifecycle)
app.use('/api/youtube', youtubeOAuthRouter);  // 🔐 YouTube OAuth
app.use('/api/youtube', youtubeChannelRouter);  // 📺 YouTube Channel
app.use('/api/youtube', youtubePlaylistsRouter);  // 📋 YouTube Playlists
app.use('/api/youtube', youtubeUploadRouter);  // 🎬 YouTube Upload
app.use('/api/gmail-oauth', gmailOAuthRouter);  // 📧 Gmail OAuth (persistent tokens!)
app.use('/api/engage', engageHydrateRouter);  // 💧 Engage Hydration

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