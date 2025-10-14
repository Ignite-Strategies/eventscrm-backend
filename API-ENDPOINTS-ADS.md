# Ad Management API Endpoints

Base URL: `http://localhost:5001/api/ads`

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create` | Create a new ad campaign |
| GET | `/summary` | Get summary metrics for all campaigns |
| GET | `/list` | List all campaigns for an organization |
| GET | `/:campaignId` | Get a single campaign by ID |
| PATCH | `/:campaignId/metrics` | Update campaign metrics |
| PATCH | `/:campaignId/status` | Update campaign status |
| DELETE | `/:campaignId` | Delete a campaign |

---

## 1. Create Campaign

**Endpoint:** `POST /api/ads/create`

**Request Body:**
```json
{
  "orgId": "cm3abc123",
  "name": "Spring Fundraiser 2024",
  "budget": 1500.00,
  "landingPage": "https://example.com/spring-event",
  "adText": "Join us for our annual Spring Fundraiser! Support a great cause while enjoying an evening of entertainment."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "campaignId": "cm3xyz789",
  "campaign": {
    "id": "cm3xyz789",
    "orgId": "cm3abc123",
    "name": "Spring Fundraiser 2024",
    "status": "Draft",
    "budget": 1500,
    "landingPage": "https://example.com/spring-event",
    "adText": "Join us for our annual Spring Fundraiser! Support a great cause...",
    "impressions": 0,
    "clicks": 0,
    "spend": 0,
    "createdAt": "2024-10-13T12:00:00.000Z",
    "updatedAt": "2024-10-13T12:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "error": "Missing required fields: orgId, name, budget, landingPage, adText"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5001/api/ads/create \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "cm3abc123",
    "name": "Spring Fundraiser 2024",
    "budget": 1500,
    "landingPage": "https://example.com/spring-event",
    "adText": "Join us for our annual Spring Fundraiser!"
  }'
```

---

## 2. Get Summary Metrics

**Endpoint:** `GET /api/ads/summary?orgId={orgId}`

**Query Parameters:**
- `orgId` (required): Organization ID

**Success Response (200):**
```json
{
  "totalCampaigns": 5,
  "activeSpend": "1572.55",
  "ctr": "2.34%",
  "conversions": 0,
  "avgCpc": "$1.38"
}
```

**Error Response (400):**
```json
{
  "error": "Missing required query parameter: orgId"
}
```

**JavaScript Example:**
```javascript
const response = await fetch('http://localhost:5001/api/ads/summary?orgId=cm3abc123');
const summary = await response.json();
console.log(summary);
```

---

## 3. List All Campaigns

**Endpoint:** `GET /api/ads/list?orgId={orgId}`

**Query Parameters:**
- `orgId` (required): Organization ID

**Success Response (200):**
```json
{
  "campaigns": [
    {
      "id": "cm3xyz789",
      "orgId": "cm3abc123",
      "name": "Spring Fundraiser 2024",
      "status": "Active",
      "budget": 1500,
      "landingPage": "https://example.com/spring-event",
      "adText": "Join us for our annual Spring Fundraiser!",
      "impressions": 12450,
      "clicks": 342,
      "spend": 487.50,
      "createdAt": "2024-10-13T12:00:00.000Z",
      "updatedAt": "2024-10-13T12:00:00.000Z"
    },
    {
      "id": "cm3def456",
      "orgId": "cm3abc123",
      "name": "Summer Gala Promotion",
      "status": "Active",
      "budget": 2000,
      "landingPage": "https://example.com/summer-gala",
      "adText": "An elegant evening under the stars!",
      "impressions": 8920,
      "clicks": 198,
      "spend": 312.75,
      "createdAt": "2024-10-13T11:00:00.000Z",
      "updatedAt": "2024-10-13T11:00:00.000Z"
    }
  ],
  "total": 2
}
```

**React Hook Example:**
```javascript
import { useEffect, useState } from 'react';
import api from '../lib/api';

function useCampaigns(orgId) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const response = await api.get(`/ads/list?orgId=${orgId}`);
        setCampaigns(response.data.campaigns);
      } catch (error) {
        console.error('Error loading campaigns:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (orgId) loadCampaigns();
  }, [orgId]);

  return { campaigns, loading };
}
```

---

## 4. Get Single Campaign

**Endpoint:** `GET /api/ads/:campaignId`

**URL Parameters:**
- `campaignId` (required): Campaign ID

**Success Response (200):**
```json
{
  "id": "cm3xyz789",
  "orgId": "cm3abc123",
  "name": "Spring Fundraiser 2024",
  "status": "Active",
  "budget": 1500,
  "landingPage": "https://example.com/spring-event",
  "adText": "Join us for our annual Spring Fundraiser!",
  "impressions": 12450,
  "clicks": 342,
  "spend": 487.50,
  "createdAt": "2024-10-13T12:00:00.000Z",
  "updatedAt": "2024-10-13T12:00:00.000Z"
}
```

**Error Response (404):**
```json
{
  "error": "Campaign not found"
}
```

---

## 5. Update Campaign Metrics

**Endpoint:** `PATCH /api/ads/:campaignId/metrics`

**URL Parameters:**
- `campaignId` (required): Campaign ID

**Request Body:**
```json
{
  "impressions": 15000,
  "clicks": 425,
  "spend": 650.25
}
```

**Success Response (200):**
```json
{
  "success": true,
  "campaign": {
    "id": "cm3xyz789",
    "orgId": "cm3abc123",
    "name": "Spring Fundraiser 2024",
    "status": "Active",
    "budget": 1500,
    "landingPage": "https://example.com/spring-event",
    "adText": "Join us for our annual Spring Fundraiser!",
    "impressions": 15000,
    "clicks": 425,
    "spend": 650.25,
    "createdAt": "2024-10-13T12:00:00.000Z",
    "updatedAt": "2024-10-13T14:30:00.000Z"
  }
}
```

**Use Case:**
This endpoint will be used by the Google Ads API sync service to update real-time metrics.

---

## 6. Update Campaign Status

**Endpoint:** `PATCH /api/ads/:campaignId/status`

**URL Parameters:**
- `campaignId` (required): Campaign ID

**Request Body:**
```json
{
  "status": "Active"
}
```

**Allowed Status Values:**
- `"Draft"` - Campaign created but not running
- `"Active"` - Campaign is currently running
- `"Paused"` - Campaign temporarily stopped

**Success Response (200):**
```json
{
  "success": true,
  "campaign": {
    "id": "cm3xyz789",
    "status": "Active",
    ...
  }
}
```

**Error Response (400):**
```json
{
  "error": "Missing required field: status"
}
```

---

## 7. Delete Campaign

**Endpoint:** `DELETE /api/ads/:campaignId`

**URL Parameters:**
- `campaignId` (required): Campaign ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

**JavaScript Example:**
```javascript
async function deleteCampaign(campaignId) {
  const confirmed = confirm('Are you sure you want to delete this campaign?');
  
  if (confirmed) {
    try {
      await api.delete(`/ads/${campaignId}`);
      alert('Campaign deleted successfully');
      // Refresh campaign list
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign');
    }
  }
}
```

---

## Metric Calculations

### Click-Through Rate (CTR)
```
CTR = (Total Clicks / Total Impressions) × 100
```

Example: 342 clicks ÷ 12,450 impressions = 2.75%

### Average Cost Per Click (CPC)
```
Average CPC = Total Spend / Total Clicks
```

Example: $487.50 ÷ 342 clicks = $1.43 per click

### Summary Aggregation
The `/summary` endpoint aggregates across all campaigns:
- **Total Campaigns**: Count of all campaigns
- **Active Spend**: Sum of `spend` field across all campaigns
- **CTR**: (Sum of clicks / Sum of impressions) × 100
- **Avg CPC**: Sum of spend / Sum of clicks

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200 OK**: Request successful
- **400 Bad Request**: Missing or invalid parameters
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

Error response format:
```json
{
  "error": "Description of what went wrong"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. For production:
- Consider implementing rate limiting per organization
- Suggested: 100 requests per minute per orgId
- Use packages like `express-rate-limit`

---

## Authentication

**Current State:** No authentication required (development)

**Production TODO:**
- Add authentication middleware
- Verify orgId belongs to authenticated user
- Use JWT tokens or session-based auth
- Check user permissions for campaign management

---

## Testing with Postman

Import this collection to test all endpoints:

```json
{
  "info": {
    "name": "Ad Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Campaign",
      "request": {
        "method": "POST",
        "url": "http://localhost:5001/api/ads/create",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"orgId\": \"cm3abc123\",\n  \"name\": \"Test Campaign\",\n  \"budget\": 1000,\n  \"landingPage\": \"https://example.com\",\n  \"adText\": \"Test ad text\"\n}"
        }
      }
    }
  ]
}
```

---

**Last Updated:** October 2024
**Version:** 1.0.0


