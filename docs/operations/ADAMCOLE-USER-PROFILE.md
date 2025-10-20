# 👤 Adam Cole - User Profile for AI Assistants

**Role:** Product Owner / Solo Builder  
**Background:** Non-coder who learned through pain  
**Status:** Smarter now, but still not a traditional developer

---

## TL;DR for AI Assistants

- Adam is NOT a trained software engineer
- He learned coding through building this CRM (trial by fire)
- He thinks in business logic, not computer science
- Optimize for HIS understanding, not textbook correctness
- If he says "freeze frame" → STOP and explain before doing anything

---

## How Adam Learns

### What Works:
✅ **Trace the actual flow** - Show him what hits what in order  
✅ **Use business terms** - "org member" not "foreign key constraint"  
✅ **Simple queries** - `Contact.findMany({ where: { orgId } })`  
✅ **Pain-driven learning** - He learns by fixing broken shit  
✅ **Real examples** - Show him actual code from his routes  

### What Doesn't Work:
❌ **Database theory** - He doesn't care about normalization  
❌ **Complex joins** - Nested includes make his head spin  
❌ **Abstract concepts** - "Let me explain ORMs..." = eyes glaze over  
❌ **Assumptions** - Don't assume he knows what Prisma does  
❌ **Moving fast** - He'll say "freeze frame!" if you're going too fast  

---

## Communication Style

### When Adam Says "Freeze Frame!"
- **STOP IMMEDIATELY**
- Don't write any more code
- Don't create any more docs
- Wait for him to ask the next question
- He needs to process what just happened

### When Adam Says "Dude..."
- He's frustrated
- Something isn't making sense
- Slow down and explain
- Don't defend your approach - just clarify

### When Adam Says "WTF is..."
- He genuinely doesn't know
- This is good - he's asking
- Explain in simple terms
- Show him where it's used

### When Adam Says "Let me..."
- He's taking control (good!)
- He'll handle it manually (often in pgAdmin)
- Don't try to automate it
- Just tell him what SQL to run

---

## Technical Understanding

### What Adam DOES Understand:
✅ **API flow** - Frontend calls backend, backend queries database  
✅ **SQL basics** - SELECT, UPDATE, INSERT (can run in pgAdmin)  
✅ **Data models** - Contact has fields, fields have values  
✅ **Routes** - `/api/contacts` maps to a file in `routes/`  
✅ **Business logic** - "If they RSVP, move them to 'rsvped' stage"  

### What Adam DOESN'T Understand (Yet):
❌ **Prisma internals** - How `@prisma/client` generates code  
❌ **Migrations** - Why `npx prisma migrate dev` exists  
❌ **Junction tables** - Why they're "better" than flat tables  
❌ **Node.js modules** - How imports/exports actually work  
❌ **Git workflows** - Branches/PRs/rebasing (just commits to main)  

### What Adam CAN Figure Out:
🤔 **Reading code** - If it's simple enough  
🤔 **Debugging routes** - By adding console.logs  
🤔 **Database queries** - If shown the SQL  
🤔 **Schema changes** - ALTER TABLE makes sense to him  

---

## Working Style

### Adam's Development Process:
1. **Identify the pain** - "Form submissions are broken"
2. **Trace the flow** - Where does the request go?
3. **Find the break** - Console.logs everywhere
4. **Fix it directly** - Often in production (yes, really)
5. **Document it** - So he doesn't forget

### Adam's Testing:
- No unit tests
- No staging environment
- Tests in production with real data
- "Break/fix on real users" is his QA process
- **This actually works** because traffic is low and users are patient

### Adam's Deployment:
- `git add .`
- `git commit -m "message"`
- `git push origin main`
- Auto-deploys to Render
- Checks logs in Render dashboard
- If broken, reverts and tries again

---

## Database Access

### Adam HAS Access To:
- **pgAdmin web interface** at https://pgadmin-cjk2.onrender.com/browser/
- Production Postgres database
- Can run SQL directly
- This is his preferred way to check/fix data

### Adam DOESN'T Have:
- Local database setup
- Working `DATABASE_URL` in local `.env`
- Prisma CLI working locally
- Desire to set any of this up

### Implications:
- Don't suggest running migrations locally
- Don't try to "fix" his local environment
- Give him SQL to run in pgAdmin instead
- Schema changes happen in production

---

## How to Help Adam

### When He's Stuck:
1. **Ask what he's trying to do** (business goal)
2. **Show him what's actually happening** (trace the code)
3. **Explain where the disconnect is** (in simple terms)
4. **Suggest the simplest fix** (not the "right" fix)

### When Suggesting Code:
- Keep it simple
- Show where it goes (file path, line number)
- Explain what it does in business terms
- Don't suggest refactoring unless asked

### When Explaining Architecture:
- Use his actual data as examples
- Reference files he's already worked with
- Don't start with theory
- Show him the `.md` docs you're adding info to

### When Things Break:
- Check Render logs (he has access)
- Look at what changed in last commit
- Suggest SQL to fix data issues
- Don't panic about "proper" rollback procedures

---

## What Adam Has Built (Context)

### The CRM:
- Event management for F3 organizations
- Contact/member management
- Email campaigns
- Forms for event registration
- Google Ads integration
- All without being a "real" developer

### The Architecture Decisions:
- **Flattened Contact model** - Because junction tables were incomprehensible
- **No local development** - Everything happens in production
- **Manual database changes** - Via pgAdmin, not migrations
- **localStorage everywhere** - Simple state management
- **Docs in markdown** - So he (and future AIs) understand decisions

### The Learning Journey:
- Started knowing nothing about databases
- Built a working SaaS product anyway
- Made "wrong" decisions that were actually right for him
- **Now understands enough to be dangerous** (his words)

---

## Red Flags (Don't Do These)

### ❌ "Let me run npx prisma migrate dev"
**Why:** Won't work, wastes time, Adam handles schema changes manually

### ❌ "This should be a junction table"
**Why:** Adam flattened it on purpose, read FLATTENING-DECISION-PAIN-LESSONS.md

### ❌ "Let me set up your local environment"
**Why:** He doesn't want one, production works fine for his scale

### ❌ "This violates database normalization"
**Why:** He knows. He doesn't care. It performs well and he understands it.

### ❌ "You should use TypeScript/tests/CI/CD"
**Why:** Scope creep. Ship features, not tooling.

---

## Green Flags (Do These)

### ✅ "Here's the SQL to run in pgAdmin"
**Why:** Direct, clear, Adam can execute this

### ✅ "This route does X, then Y, then Z"
**Why:** Traces the flow, helps Adam understand

### ✅ "Let me document this in the .md"
**Why:** Captures knowledge for next time

### ✅ "The form is calling this endpoint"
**Why:** Business logic he can follow

### ✅ "Should I freeze frame and explain?"
**Why:** Respects his pace, lets him control flow

---

## Current Projects/Pain Points

### Working On:
- Form submissions (Bros & Brews event registration)
- containerId not being set properly
- Schema files out of sync
- Routes using fields that might not exist

### Recent Wins:
- Organized docs into `/docs` structure
- Created FLATTENING-DECISION doc
- Fixed orphaned routes issue
- Cleaned up debugging scripts

### Learning:
- How Prisma actually works
- When to use junctions vs flat tables
- Database schema vs code schema
- How to read route files

---

## Working with Adam's Repos

### Multiple Workspaces:
- `eventscrm-backend` - Main backend (Express + Prisma)
- `ignitestrategescrm-frontend` - Admin dashboard (React)
- `ignite-ticketing` - Public forms (React)
- `impactevents-landing` - F3 landing pages
- Others in the workspace

### Common Patterns:
- Backend on Render (Node.js)
- Frontend on Vercel
- Database on Render/Neon (Postgres)
- All auto-deploy from GitHub main branch

---

## Success Metrics

### For Adam:
- ✅ **It works** - Users can do the thing
- ✅ **He understands it** - Can fix it when it breaks
- ✅ **It's documented** - Won't forget how it works
- ✅ **It's fast** - Sub-second response times

### NOT Success:
- ❌ "Proper" architecture that he can't debug
- ❌ Complex code that works but he doesn't understand
- ❌ Following best practices that slow him down
- ❌ Building for scale he doesn't have

---

## Quotes to Remember

> "I'm not a freaking coder" - When frustrated by assumptions

> "Freeze frame!" - When things are moving too fast

> "Dude, look at the damn code!" - When you're theorizing instead of checking reality

> "I learned through pain" - His actual teaching method

> "Just give me the SQL" - Preferred solution delivery method

---

## For New AI Assistants

If this is your first time working with Adam:

1. **Read this profile first**
2. **Read FLATTENING-DECISION-PAIN-LESSONS.md**
3. **Read MODEL-ARCHITECTURE.md**
4. **Check what's in the actual routes** (not what "should" be)
5. **Ask before assuming**

If you suggest something and Adam says "freeze frame":
- You went too fast or too complex
- Stop and explain in simpler terms
- Show him the actual code, don't describe it abstractly

If you see code that's "wrong":
- Check if it's wrong or just different
- Read the docs to see if it's intentional
- Don't "fix" working code without asking

---

## Adam's Philosophy

**Ship working > Ship perfect**  
**Understand it > Optimize it**  
**Document pain > Repeat pain**  
**Business value > Code elegance**

This isn't lazy. It's **pragmatic**.

He's building a real business with real users, not a portfolio project or a textbook example.

The code works. Users are happy. Revenue is coming in.

That's success.

---

## Contact

- GitHub: Ignite-Strategies repos
- Works in: Multiple workspace folders (see above)
- Timezone: US-based
- Availability: Builds at night, ships features fast

---

**Remember:** Adam isn't trying to become a "real" developer. He's trying to build a successful business. Code is a tool, not the goal.

Help him ship features, understand what he built, and document decisions.

That's how you work effectively with Adam.

🚀 **Now go build something useful.**

