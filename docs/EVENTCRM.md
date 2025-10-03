# Event CRM System - Core Architecture

## Overview
Event CRM manages the complete funnel from supporter to paid attendee across multiple audience types and events.

## Core Models & Flow

### 1. Supporter (Master CRM)
- **Purpose**: Master contact record for all individuals
- **Location**: `models/Supporter.js`
- **Key Fields**: firstName, lastName, email, phone, categoryOfEngagement, etc.
- **Relationship**: One supporter can be in multiple event pipelines

### 2. Event
- **Purpose**: Event configuration and goals
- **Location**: `models/Event.js`
- **Key Fields**: name, date, location, hasTickets, ticketCost, goals, audienceSegmentation
- **Relationship**: One event has multiple pipelines (one per audience type)

### 3. EventPipeline (Working Funnel)
- **Purpose**: Temporary working funnel for each event/audience combination
- **Location**: `models/EventPipeline.js`
- **Key Fields**: eventId, supporterId, audienceType, stage, rsvp, paid, amount
- **Stages**: `member` → `soft_commit` → `paid`
- **Relationship**: Links supporters to specific events with audience segmentation

### 4. EventAttendee (Final Record)
- **Purpose**: Permanent record of event participation
- **Location**: `models/EventAttendee.js`
- **Key Fields**: eventId, supporterId, paid, amount, paymentDate
- **Relationship**: Final destination after successful payment

## MongoDB Ninja Magic

### Pipeline Creation Flow
1. **Event Created** → Basic event details saved
2. **Pipeline Config** → User selects audience types (e.g., "F3 Members")
3. **Backend Magic** → Creates separate pipeline collections per audience type
4. **Supporter Push** → Supporters get pushed into appropriate pipelines
5. **Stage Progression** → Members move through stages as they engage

### Data Relationships
```
Organization
├── Supporters (Master CRM)
├── Events
    ├── EventPipeline (org_member) → [Supporter1, Supporter2, ...]
    ├── EventPipeline (friend_spouse) → [Supporter3, Supporter4, ...]
    └── EventAttendee (Final Records) → [Paid Supporter1, Paid Supporter2, ...]
```

### Key Services
- **`eventPipelineService.js`**: Push supporters into pipelines, graduate to attendees
- **`supporterMutation.js`**: CRUD operations on master supporter list
- **`csvService.js`**: Import supporters from CSV files

## MVP1 Focus: F3 Members Only

### Phase 1: Core Member Pipeline
- **Audience Type**: `org_member` only
- **Stages**: Member → Soft Commit → Paid
- **Features**:
  - Push F3 members into event pipeline
  - Drag & drop stage progression
  - Payment tracking
  - Graduate to final attendee record

### Phase 2: Multi-Audience (Future)
- Add friend_spouse, community_partner, business_sponsor, champion
- Advanced segmentation and targeting
- Conversion rate optimization

## API Endpoints

### Event Pipeline Routes
- `GET /events/:eventId/pipeline` - Get all pipeline records for event
- `POST /events/:eventId/pipeline/push` - Push supporters into pipeline
- `POST /events/:eventId/pipeline/push-all` - Push all supporters
- `PATCH /events/pipeline/:pipelineId` - Update pipeline record (move stage)

### Supporter Routes
- `GET /orgs/:orgId/supporters` - List all supporters
- `POST /orgs/:orgId/supporters` - Create single supporter
- `POST /orgs/:orgId/supporters/csv` - Bulk CSV upload
- `PATCH /supporters/:supporterId/update` - Update supporter field
- `DELETE /supporters/:supporterId` - Delete supporter

## Frontend Flow

### 1. Event Creation
- Basic event details (name, date, location, tickets)
- Success page with next steps

### 2. Pipeline Configuration
- Select audience types (MVP1: F3 Members only)
- Create pipeline collections

### 3. Pipeline Management
- View supporters in funnel stages
- Push supporters from master list
- Drag & drop stage progression
- Track payments and RSVPs

### 4. Supporter Management
- Master supporter list with inline editing
- CSV upload and validation
- Individual supporter detail pages

## Next Steps for MVP1

1. **Simplify Pipeline Config** - F3 Members only
2. **Build Pipeline Push Service** - Get supporters into funnel
3. **Create Pipeline Kanban** - Visual stage management
4. **Add Payment Integration** - Stripe webhook handling
5. **Graduate to Attendee** - Final record creation

## Future Enhancements

- Multi-audience pipeline management
- Advanced segmentation rules
- Email campaign integration
- Analytics and reporting
- HubSpot integration
- Landing page generation
