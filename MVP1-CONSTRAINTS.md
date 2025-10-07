# MVP1 Constraints - Ship Fast, Iterate Later

## 🎯 Design Decisions for Speed

These constraints simplify MVP1 to ship faster. Each has a clear path to expand later.

---

## 1️⃣ Single Active Event

**Rule:** One organization can only have ONE active event at a time.

**Why:**
- ✅ Simpler UX (no event selection dropdowns)
- ✅ Clearer focus (everyone knows which event)
- ✅ Faster development (less state management)
- ✅ Easier testing (one path to validate)

**Event Status Flow:**
```
draft → upcoming → active → past
```

**Enforcement:**
```javascript
// Option A: Hard block
if (await hasActiveEvent(orgId)) {
  throw new Error("Archive current event before creating another");
}

// Option B: Auto-archive (recommended)
await prisma.event.updateMany({
  where: { orgId, status: { in: ['upcoming', 'active'] } },
  data: { status: 'past' }
});
// Then create new event
```

**UI Impact:**
- Dashboard shows THE event (not a list)
- Forms are always for THE current event
- Pipeline page doesn't need event selector
- Navigation is simpler

**When to Expand:**
- User feedback: "I need to plan 2 events at once"
- Multi-team orgs (different events per team)
- Event templates (clone past events)

**Migration Path:**
- Add `isActive` boolean (only one true at a time)
- Or remove constraint entirely
- UI already handles multiple events (Events.jsx)

---

## 2️⃣ Single Audience Type (org_members only)

**Rule:** MVP1 focuses on `org_members` pipeline only.

**Why:**
- ✅ Most orgs start with their member list
- ✅ Simpler funnel (one pipeline to manage)
- ✅ Faster to build and test
- ✅ Can add other audiences incrementally

**Supported Pipelines:**
- `org_members` - Auto-populated from OrgMember list
- `landing_page_public` - Self-service forms (soft commit)

**Not Supported Yet:**
- `friends_family` - Member +1s
- `community_partners` - Nonprofits, government
- `business_sponsors` - Corporate sponsors
- `cold_outreach` - Paid ads, social media

**When to Expand:**
- User has different conversion rates per audience
- Need to track source attribution
- Want custom stages per audience type

**Migration Path:**
- Models already support it (EventPipeline.audienceType)
- Just need UI to create multiple pipelines
- Forms already link to specific pipelines

---

## 3️⃣ No Email Automation

**Rule:** Email features are manual for MVP1.

**Why:**
- ✅ Email providers are fragile (SendGrid, Mailgun)
- ✅ Focus on event management first
- ✅ Can use external tools (Mailchimp) for now

**Supported:**
- Manual email composition
- Template storage
- Contact list creation

**Not Supported:**
- Automated sequences
- Trigger-based emails
- A/B testing
- Email analytics

**When to Expand:**
- User has consistent email needs
- Want to track opens/clicks
- Need automated follow-ups

---

## 4️⃣ No Payment Integration (Currently)

**Rule:** Payment backend is on ice due to Stripe fragility.

**Why:**
- ⚠️ Payment processing is high-risk
- ⚠️ Stripe compliance is strict
- ⚠️ Chargebacks are complex
- ✅ Focus on CRM features first

**Workaround:**
- Manual payment tracking
- External Stripe links
- Mark as "paid" manually in CRM

**When to Resume:**
- Payment risk is managed
- Compliance is solid
- Have support for disputes

**Integration Ready:**
- EventAttendee has `amountPaid` field
- Pipeline has `paid` stage
- Webhook endpoint exists

---

## 5️⃣ No Multi-Org (Yet)

**Rule:** Each OrgMember belongs to ONE organization only.

**Why:**
- ✅ Simplest data model
- ✅ Clear ownership
- ✅ No permission complexity

**Not Supported:**
- Shared contacts across orgs
- Multi-org user accounts
- Cross-org reporting

**When to Expand:**
- SaaS model (multiple customers)
- White-label solution
- Agency managing multiple clients

**Migration Path:**
- Add `OrgMembership` join table
- Support multiple `orgId`s per contact
- Permission system per org

---

## 6️⃣ Basic Field Types Only

**Rule:** Forms support: text, email, phone, number, select, textarea, checkbox.

**Not Supported:**
- File uploads
- Date pickers
- Multi-select
- Conditional logic
- Calculated fields

**When to Expand:**
- User needs more complex forms
- Integration with other tools
- Advanced validation rules

---

## 🚀 The Path Forward

### MVP1 (Now):
1. Single active event
2. org_members + landing_page_public pipelines
3. Manual email/payment
4. Basic form fields
5. Single org per user

### MVP2 (Next):
1. Multiple simultaneous events
2. All audience types (friends_family, etc.)
3. Email automation
4. Advanced form fields
5. Payment integration resumes

### SaaS (Future):
1. Multi-org support
2. White-label
3. API for integrations
4. Mobile apps
5. Advanced analytics

---

## 📝 Decision Log

**When you hit a constraint:**
1. Document it here
2. Note the workaround
3. Track user feedback
4. Plan expansion path

**Example:**
```
User: "Can I create 2 events at once?"
Answer: "MVP1 supports one active event. You can archive the current 
         one and create another. We're tracking demand for multi-event."
Action: Add tally mark to "multi-event requests" tracker
Decision: Expand after 10 requests OR 3 months (whichever first)
```

---

## ✅ Benefits of Constraints

**Shipping > Perfection**
- Get feedback faster
- Validate assumptions
- Learn what users actually need
- Iterate based on real usage

**Less is More**
- Simpler code = fewer bugs
- Focused features = better UX
- Clear path = faster onboarding
- One thing done well > many things done poorly

**MVP1 is a Launchpad, Not a Prison**
- Architecture supports expansion
- Models are flexible
- Just need UI and logic
- Can add features incrementally

🚀 **Ship it, learn, iterate!**

