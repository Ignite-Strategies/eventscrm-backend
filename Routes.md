# API Routes Documentation

## Overview
This backend provides RESTful APIs for the Ignite Strategies Event CRM system.

## Base URL
- **Development:** `http://localhost:5001/api`
- **Production:** `https://eventscrm-backend.onrender.com/api`

## Route Files (All end with "Route.js")
- `orgsRoute.js` - Organization management
- `supportersRoute.js` - Master supporter list (CRM)
- `eventsRoute.js` - Event creation and management
- `eventPipelinesRoute.js` - Event pipeline records (working funnel)
- `eventAttendeesRoute.js` - Final event attendees (permanent records)
- `eventPipelineActionsRoute.js` - Pipeline actions (push supporters to events)
- `webhooksRoute.js` - Webhook handlers

## Organization Routes (`/api/orgs`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orgs/first` | Get first organization (for login) |
| POST | `/orgs` | Create new organization |
| GET | `/orgs/:orgId` | Get organization details |
| PUT | `/orgs/:orgId` | Update organization |

## Supporter Routes (`/api/orgs/:orgId/supporters`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orgs/:orgId/supporters` | Get all supporters for org |
| POST | `/orgs/:orgId/supporters` | Create new supporter |
| POST | `/orgs/:orgId/supporters/csv` | Bulk upload supporters via CSV |
| DELETE | `/supporters/:supporterId` | Delete supporter |

## Event Routes (`/api/orgs/:orgId/events` & `/api/events`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orgs/:orgId/events` | Create new event |
| GET | `/events/:eventId` | Get event details |
| PUT | `/events/:eventId` | Update event |
| DELETE | `/events/:eventId` | Delete event |

## Event Pipeline Routes (`/api/events/:eventId/pipeline`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events/:eventId/pipeline` | Get all pipeline records for event |
| PATCH | `/events/:eventId/pipeline/:pipelineId` | Update pipeline record |
| DELETE | `/events/:eventId/pipeline/:pipelineId` | Remove from pipeline |

## Event Attendee Routes (`/api/events/:eventId/attendees`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events/:eventId/attendees` | Get all attendees for event |
| POST | `/events/:eventId/attendees` | Create attendee record |
| PATCH | `/events/:eventId/attendees/:attendeeId` | Update attendee |
| DELETE | `/events/:eventId/attendees/:attendeeId` | Remove attendee |

## Pipeline Actions (`/api/events/:eventId/pipeline`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events/:eventId/pipeline/push` | Push specific supporters to event |
| POST | `/events/:eventId/pipeline/push-all` | Push all supporters to event |
| POST | `/events/:eventId/pipeline/push-by-tag` | Push supporters by tag filter |

## Webhook Routes (`/api/webhooks`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/stripe` | Stripe payment webhook |
| POST | `/webhooks/rsvp` | RSVP form webhook |

## Data Flow
1. **Supporter** (Master CRM) → **EventPipeline** (Working Funnel) → **EventAttendee** (Final Record)
2. CSV uploads go directly to **Supporter** model
3. Event creation pushes supporters into **EventPipeline**
4. Payment/registration graduates to **EventAttendee**

## Authentication
- Hardcoded: `admin` / `igniteevents2025`
- Organization ID stored in localStorage
- All routes require valid orgId

## Error Handling
- 400: Bad Request (validation errors, missing data)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error (database issues)

## CSV Upload Format
Required fields: `First Name`, `Last Name`, `Email`
Optional fields: `Goes By`, `Phone`, `Street`, `City`, `State`, `Zip`, `Employer`, `Years With Organization`
