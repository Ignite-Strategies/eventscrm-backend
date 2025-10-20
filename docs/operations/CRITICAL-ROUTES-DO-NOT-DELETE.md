# 🚨 CRITICAL ROUTES - DO NOT DELETE OR MODIFY

## ⚠️ SYSTEMIC ISSUE: Routes Keep Getting Orphaned

**PROBLEM:** Routes get created in `/routes` folder but never registered in `index.js`, causing 404s in production.

This has happened **AT LEAST 6 TIMES** based on git history:
- contactFormSubmitRoute ← YOU ARE HERE
- formDashHydratorRoute
- formCreatorSaverRoute  
- formsPublicHydrateRoute
- contactHydrateRoute
- eventAttendeesRoute

---

## 🔒 PROTECTED ROUTES - NEVER REMOVE FROM index.js

### **1. Form Submission Route - PUBLIC FACING!**

```javascript
import contactFormSubmitRouter from './routes/contactFormSubmitRoute.js';
app.use('/api/forms', contactFormSubmitRouter);  // POST /api/forms/submit
```

**WHY IT EXISTS:**
- Powers ALL public event registration forms (f3capital.com, impactevents.com, etc.)
- Creates/updates Contact records when people register for events
- If this breaks, NO ONE CAN REGISTER for events → Lost revenue!

**DEPENDENCIES:**
- Frontend: `ignite-ticketing/src/pages/PublicForm.jsx`
- Endpoint: `POST /api/forms/submit`
- Used by: F3 Capital Bros & Brews, Impact Events forms

**DO NOT:**
- ❌ Remove this import/route
- ❌ Change the endpoint path
- ❌ Mark it as "deprecated" 
- ❌ Think "this looks unused" (it's hit by external sites!)

---

### **2. Public Forms Hydration Route**

```javascript
import formsPublicHydrateRouter from './routes/formsPublicHydrateRoute.js';
app.use('/api/forms/public', formsPublicHydrateRouter);
```

**WHY IT EXISTS:**
- Loads form metadata for public display
- Must run BEFORE form submission endpoint
- GET /api/forms/public/:slug

---

### **3. Contact Unified Router**

```javascript
import contactUnifiedRouter from './routes/contactUnifiedRoute.js';
app.use('/api/contacts', contactUnifiedRouter);
```

**WHY IT EXISTS:**
- Primary Contact CRUD operations
- Powers the entire CRM contact system
- NO orgId required (works across containers)

---

### **4. Form Creation Routes**

```javascript
import formCreatorSaverRouter from './routes/formCreatorSaverRoute.js';
import formDashHydratorRouter from './routes/formDashHydratorRoute.js';

app.use('/api/forms/saver', formCreatorSaverRouter);
app.use('/api/forms', formDashHydratorRouter);
```

**WHY IT EXISTS:**
- Create/edit forms in admin dashboard
- List forms for events
- If removed, admins can't create registration forms

---

## 📋 NEW ROUTE CHECKLIST

When creating a new route file:

1. ✅ Create the route file in `/routes`
2. ✅ **IMMEDIATELY** add import to `index.js`
3. ✅ **IMMEDIATELY** add `app.use()` mounting
4. ✅ Test the endpoint locally
5. ✅ Commit BOTH files together
6. ✅ Add entry to this document if it's critical

**DO NOT:**
- ❌ Create route file and "come back later" to register it
- ❌ Assume someone else will register it
- ❌ Skip testing the actual HTTP endpoint

---

## 🔍 HOW TO CHECK IF ROUTE IS REGISTERED

```bash
# Search for route import
grep -r "contactFormSubmit" index.js

# If NO results → Route is orphaned! 🚨
```

---

## 🛡️ PROTECTION RULES

### For AI Assistants (Claude/Cursor):
1. **NEVER** suggest removing route imports that include "Form", "Contact", "Public"
2. **ALWAYS** check if a route file has a corresponding import in index.js
3. **ALWAYS** warn user before removing any route registration
4. If cleanup is requested, show user what the route does FIRST

### For Developers:
1. Before removing ANY route, search codebase for usage
2. Check git history - has this been "fixed" before? → Don't delete!
3. Check for external dependencies (landing pages, ticketing apps)
4. When in doubt, mark as `@deprecated` but DON'T DELETE

---

## 📊 FORM SUBMISSION FLOW (MUST WORK!)

```
User visits form
  ↓
f3capital.com/forms/bros-brews
  ↓
ignite-ticketing/PublicForm.jsx loads
  ↓
GET /api/forms/public/bros-brews (loads form metadata)
  ↓
User fills out form
  ↓
POST /api/forms/submit ← THIS MUST WORK!
  ↓
Contact created/updated in database
  ↓
Success page
```

**If /api/forms/submit returns 404:**
- Public registration is BROKEN
- Events lose attendees
- Revenue is lost
- Customer complaints

---

## 🚑 EMERGENCY FIX

If form submissions are broken (404 errors):

1. Check `index.js` for:
   ```javascript
   import contactFormSubmitRouter from './routes/contactFormSubmitRoute.js';
   ```

2. Check for:
   ```javascript
   app.use('/api/forms', contactFormSubmitRouter);
   ```

3. If missing, add BOTH lines

4. Commit and push immediately

5. Verify on Render logs: "📝 Form submission received"

---

## 📝 LAST UPDATED

- **Date:** 2025-10-20
- **By:** System fix after route was found orphaned
- **Incident:** contactFormSubmitRoute existed but was never registered in index.js
- **Impact:** All public form submissions returned 404

---

**Remember:** If a route file exists in `/routes`, it MUST be registered in `index.js`. No exceptions!

