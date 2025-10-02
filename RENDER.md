# Render Deployment Configuration

## Environment Variables

**REQUIRED** - Set these in Render dashboard under "Environment" tab:

### MONGO_URI
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net
```
**Database name `SUPPORTER_DB` is set in code via `dbName` option**

### PAY_BACKEND_URL
```
PAY_BACKEND_URL=https://ignite-pay-backend.onrender.com
```

### FRONTEND_URL
```
FRONTEND_URL=https://your-crm-frontend.vercel.app
```

### PORT (Auto-set by Render)
```
PORT=10000
```
(Render sets this automatically, don't override)

---

## Optional Environment Variables

### SENDGRID_API_KEY
```
SENDGRID_API_KEY=SG.your_key_here
```
For email campaigns (not required for MVP)

### NODE_ENV
```
NODE_ENV=production
```

---

## Build Settings

**Build Command:** `npm install`  
**Start Command:** `npm start`  
**Node Version:** 18 or higher

---

## Auto-Deploy

Enable auto-deploy from GitHub:
- Branch: `main`
- Every push to main triggers new deployment

---

## Verify Deployment

After deployment, test:

```bash
# Health check
curl https://eventscrm-backend.onrender.com/health

# Should return:
{"status":"ok","timestamp":"2025-10-02T..."}
```

---

## Database Collections

**SUPPORTER_DB** contains:
- organizations
- supporters
- events
- eventpipelines
- eventattendees
- partners
- sponsors
- adminusers

---

## Common Issues

### MongoDB Connection Timeout
- Check `MONGODB_URI` is set correctly
- Must end with `/SUPPORTER_DB`
- Verify MongoDB Atlas IP whitelist allows Render IPs (0.0.0.0/0)

### CORS Errors
- Set `FRONTEND_URL` correctly
- Restart service after env var changes

### Routes 404
- Verify latest code is deployed
- Check Render logs for errors
- Force manual deploy if auto-deploy didn't trigger

---

**Production URL:** https://eventscrm-backend.onrender.com

