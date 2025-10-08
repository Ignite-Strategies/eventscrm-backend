# Events CRM Backend

Backend API for event management CRM with pipeline automation and funnel tracking.

## Features

- **Pipeline Automation**: Auto-advance contacts through stages based on actions
- **Rules Engine**: Configurable automation rules per event
- **Champion Tracking**: Identify and flag high-engagement advocates
- **CSV Import**: Bulk upload contacts
- **Payment Integration**: Webhook handler for pay-backend
- **Master CRM**: De-duplicated contact management per organization

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Multer (CSV uploads)
- Axios (pay-backend integration)

## Installation

```bash
npm install
```

## Environment Variables

Create `.env` file:

```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/ignite-crm
PAY_BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
SENDGRID_API_KEY=your_key_here
```

## Run

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Organizations
- `POST /api/orgs` - Create organization
- `GET /api/orgs/:orgId` - Get organization
- `PATCH /api/orgs/:orgId` - Update organization

### Contacts
- `POST /api/orgs/:orgId/contacts` - Upsert contact
- `POST /api/orgs/:orgId/contacts/csv` - Bulk CSV upload
- `GET /api/orgs/:orgId/contacts` - List contacts (search, filter)

### Events
- `POST /api/orgs/:orgId/events` - Create event
- `GET /api/orgs/:orgId/events` - List events
- `GET /api/events/:eventId` - Get event
- `PATCH /api/events/:eventId` - Update event
- `GET /api/events/:eventId/pipeline-config` - Get pipeline config

### Memberships (Pipeline)
- `POST /api/events/:eventId/memberships` - Add contacts to event
- `POST /api/events/:eventId/memberships/from-form` - Landing form intake
- `PATCH /api/memberships/:membershipId` - Update stage/tags
- `POST /api/memberships/:membershipId/champion` - Mark champion
- `GET /api/events/:eventId/memberships` - List memberships

### Webhooks
- `POST /api/webhooks/payment` - Payment confirmation from pay-backend

## Integration with Pay Backend

This backend receives payment confirmations from `ignite-pay-backend`:

```javascript
// Pay backend sends:
POST /api/webhooks/payment
{
  membershipId: "abc123",
  amount: 50.00,
  stripeSessionId: "cs_xyz"
}

// CRM backend auto-advances to "paid" stage
```

## Data Models

**Organization** → Master CRM container  
**Contact** → De-duplicated contacts (one per org)  
**Event** → Event with pipeline rules  
**ContactEventMembership** → Join table (contact ↔ event)

## Pipeline Stages

Default: `sop_entry → rsvp → paid → attended → champion`

## Rules Engine

Auto-advance based on:
- SOP Entry: landing_form, csv, qr, admin_add
- RSVP: form_rsvp, button_click
- Paid: Payment webhook from pay-backend
- Champion: Engagement score ≥ threshold OR qualifying tags

## Deployment

Deploy to Render, Railway, Heroku, or any Node.js host.

**MongoDB**: Use MongoDB Atlas for production.

## License

Proprietary

