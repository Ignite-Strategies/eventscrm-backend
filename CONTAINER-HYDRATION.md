# Container Hydration Guide

## Overview
This document explains how contact hydration works using the Container architecture.

## Container Configuration

### Current Container Setup
- **Container ID**: `cmgu7w02h0000ceaqt7iz6bf9`
- **Container Name**: `F3 CRM`
- **Container Slug**: `f3-crm`
- **Organization ID**: `cmgfvz9v10000nt284k875eoc`
- **Event ID**: `cmggljv7z0002nt28gckp1jpe` (Bros & Brews)

### Contact Data Structure
All contacts have the following relationships:
- **`containerId`**: Groups contacts by container (F3 CRM)
- **`orgId`**: Organization membership
- **`eventId`**: Event attendance (currently NULL for most)

## API Endpoints

### Get All Contacts
```
GET /api/contacts?containerId=cmgu7w02h0000ceaqt7iz6bf9
```

### Get Contacts by Organization
```
GET /api/contacts?orgId=cmgfvz9v10000nt284k875eoc
```

### Get Contacts by Event
```
GET /api/contacts?eventId=cmggljv7z0002nt28gckp1jpe
```

### Get All Contacts (no filter)
```
GET /api/contacts
```

## Frontend Usage

### Contact List Builder
- **URL**: `https://ignitestrategiescrm-frontend.vercel.app/contact-list-all`
- **Purpose**: Simple contact list with select/unselect functionality
- **API Call**: Uses `containerId` to get all contacts

### Contact Hydration Flow
1. **Frontend** calls `/api/contacts?containerId=cmgu7w02h0000ceaqt7iz6bf9`
2. **Backend** queries Contact table with `containerId` filter
3. **Returns** all contacts with firstName, lastName, email, currentStage, audienceType
4. **Frontend** displays contacts in table with select/unselect checkboxes

## Database Schema

### Contact Table
```sql
-- Key fields for hydration
containerId String?  -- Groups contacts by container
orgId       String?  -- Organization membership  
eventId     String?  -- Event attendance
firstName   String   -- Contact name
lastName    String   -- Contact name
email       String   -- Contact email
currentStage String? -- Pipeline stage
audienceType String? -- Audience classification
```

### Container Table
```sql
-- Container grouping
id          String   -- Unique container ID
name        String   -- Container name (F3 CRM)
slug        String   -- URL slug (f3-crm)
description String?  -- Container description
```

## Migration History

### Initial Setup
1. **Created Container**: F3 CRM with ID `cmgu7w02h0000ceaqt7iz6bf9`
2. **Updated Contacts**: All 27 contacts got `containerId` and `orgId`
3. **Verified**: All contacts now have proper relationships

### Current Status
- ✅ **27 contacts** with `containerId`
- ✅ **27 contacts** with `orgId`  
- ❌ **0 contacts** with `eventId` (needs population)

## Next Steps

### Populate Event Relationships
```sql
-- Add eventId to all contacts
UPDATE "Contact" 
SET "eventId" = 'cmggljv7z0002nt28gckp1jpe'
WHERE "eventId" IS NULL;
```

### Frontend Development
- Build audience type management
- Build current stage management  
- Build contact selection and list creation
- Build campaign targeting by container/org/event

## Troubleshooting

### No Contacts Loading
1. Check if `containerId` is set in Contact table
2. Verify API endpoint is using correct `containerId`
3. Check backend logs for query errors

### Missing Relationships
1. Run the SQL updates to populate `orgId` and `eventId`
2. Verify all contacts have the same `containerId`
3. Check foreign key constraints are satisfied
