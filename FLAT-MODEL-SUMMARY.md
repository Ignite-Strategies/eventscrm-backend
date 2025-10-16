# 🔥 MVP1: FLAT CONTACT MODEL

## The Decision:

**FUCK IT - FLATTEN EVERYTHING!**

Delete OrgMember, delete EventAttendee. Just Contact. That's it.

## The New Model:

```prisma
model Contact {
  id String @id
  
  // PERSONHOOD (who they are)
  firstName, lastName, email, phone, goesBy
  address, birthday, family, employer
  
  // ORG (which org, one only)
  orgId String?
  isOrgMember Boolean?
  yearsWithOrganization Int?
  leadershipRole String?
  
  // EVENT (which event, current only)  
  eventId String?
  currentStage String?
  attended Boolean?
  amountPaid Float?
}
```

## The Queries:

```javascript
// Org members
Contact.findMany({ 
  where: { orgId, isOrgMember: true } 
})

// Event attendees
Contact.findMany({ 
  where: { eventId } 
})

// Contact detail
Contact.findUnique({ 
  where: { id } 
})
// Everything is right there!
```

## What We Lose (For Now):

❌ Event attendance history (only tracks CURRENT event)  
❌ Multi-org capability (one org per person)  
❌ Past event payments/stages

## What We Gain:

✅ **ZERO HYDRATION CONFUSION**  
✅ **ONE TABLE, ONE QUERY**  
✅ **NO MORE "WHERE IS THIS FIELD?" QUESTIONS**  
✅ **NO MORE CONTACTID NULL BULLSHIT**  
✅ **SUPER FAST QUERIES**  

## The Queries Are Dead Simple:

**Before (junction mess):**
```javascript
const orgMembers = await prisma.orgMember.findMany({
  where: { orgId },
  include: {
    contact: {
      include: {
        eventAttendees: {
          include: {
            event: true
          }
        }
      }
    },
    engagement: true
  }
});

const members = orgMembers.map(m => ({
  firstName: m.contact?.firstName || m.firstName || '',  // WTF?
  goesBy: m.contact?.goesBy || m.goesBy || '',
  // ... 50 more lines of mapping hell
}));
```

**After (flat paradise):**
```javascript
const orgMembers = await prisma.contact.findMany({
  where: { orgId, isOrgMember: true }
});

// That's it! Everything is already there!
```

## Migration Plan:

1. ✅ Schema created (`schema-mvp1-flat.prisma`)
2. ⏳ Run migration script to flatten data
3. ⏳ Update backend routes (super simple now!)
4. ⏳ Deploy and test

## When to Add Junction Tables Back:

**Read:** `JUNCTION-TABLE-EXPLAINED.md`

**Short version:**
- When you need event attendance HISTORY
- When you need people in MULTIPLE orgs
- When you need payment history across events

For now? **Flat is perfect.** 🔥

## Files Created:

- ✅ `schema-mvp1-flat.prisma` - New flat schema
- ✅ `JUNCTION-TABLE-EXPLAINED.md` - Explains junction pattern for later
- ✅ `MVP1-FLAT-MIGRATION.md` - How to migrate existing data
- ✅ `FLAT-MODEL-SUMMARY.md` - This file

## Next Steps:

1. Review the flat schema
2. Run migration to flatten data
3. Update routes (will be way simpler!)
4. Test and deploy

**Welcome to Contact-First, Flat-As-Fuck MVP1!** 💪

