# Migration Plan - October 13th

## 🎯 Current Status
We've made significant progress on contact management and inline editing, but there are several architectural improvements needed.

## ✅ Completed Migrations

### 1. Contact Management Architecture
- ✅ **Contact-First Model**: Universal `Contact` model with optional `OrgMember` and `EventAttendee` relationships
- ✅ **Field Mapping**: Moved `employer` from `OrgMember` to `Contact` (universal personhood)
- ✅ **Inline Editing**: All OrgMember fields now editable with immediate save
- ✅ **Phone Formatting**: Fixed display formatting in inline editing
- ✅ **Type Conversion**: Fixed numeric field handling (`yearsWithOrganization`, `numberOfKids`)

### 2. Reference Tables
- ✅ **Engagement Model**: Values 1-4 (undetermined, low, medium, high)
- ✅ **LeadershipRole Model**: Values 1-4 (none, project_lead, committee, board)
- ✅ **LikelihoodToAttend Model**: Values 1-4 (high, medium, low, support_from_afar)
- ✅ **Auto-seeding**: All reference tables seed automatically on deploy

### 3. EventAttendee Model
- ✅ **Rock Solid Columns**: Added `spouseOrOther`, `howManyInParty`, `likelihoodToAttendId`
- ✅ **JSON Notes**: Changed from `String?` to `Json?` for custom fields
- ✅ **Field Mapping**: Form fields now map to specific columns instead of generic notes

## 🔄 Pending Migrations

### 1. LeadershipRole FK Migration
**Current**: `OrgMember.leadershipRole String?`
**Target**: `OrgMember.leadershipRoleId String?` → `LeadershipRole.id`

**Steps**:
- [ ] Add `leadershipRoleId` field to OrgMember
- [ ] Add relationship to LeadershipRole model
- [ ] Create migration script to map existing string values to FK
- [ ] Update frontend to use reference values instead of strings
- [ ] Remove `leadershipRole` string field

### 2. Engagement FK Migration
**Current**: `OrgMember.engagementValue` (hydrated from Engagement table)
**Target**: Direct `engagementId` usage in frontend

**Steps**:
- [ ] Update frontend to use `engagementId` instead of `engagementValue`
- [ ] Remove hydration of `engagementValue` from backend
- [ ] Update EditableFieldComponent to handle FK relationships

### 3. Event Relationship Simplification
**Current**: Complex 3-layer relationship `OrgMember → Contact → EventAttendees → Event`
**Target**: Direct event association or flattened data structure

**Options**:
- [ ] **Option A**: Add `primaryEventId` to Contact model
- [ ] **Option B**: Flatten event data in OrgMember response
- [ ] **Option C**: Create dedicated OrgMemberEvents junction table

### 4. Contact List Architecture
**Current**: Contact lists are separate entities
**Target**: Better integration with OrgMember management

**Steps**:
- [ ] Create contact lists from event attendees
- [ ] Create contact lists from org members
- [ ] Create contact lists from all contacts
- [ ] Add bulk operations (email campaigns, list management)

### 5. Email Service Architecture
**Current**: Mixed personal/enterprise email handling
**Target**: Clear separation of email services

**Steps**:
- [ ] **Personal Email**: Gmail OAuth (✅ completed)
- [ ] **Enterprise Email**: SendGrid integration
- [ ] **Email Templates**: Template management system
- [ ] **Email Campaigns**: Bulk email with tracking

### 6. Form Field Mapping
**Current**: Some fields still go to generic `notes` JSON
**Target**: All common fields mapped to specific columns

**Remaining Fields**:
- [ ] Map "f3_name" → `Contact.goesBy` (✅ completed)
- [ ] Map "bringing_m" → `EventAttendee.spouseOrOther` (✅ completed)
- [ ] Map "how_many_in_party" → `EventAttendee.howManyInParty` (✅ completed)
- [ ] Map "how_likely_to_attend" → `EventAttendee.likelihoodToAttendId` (✅ completed)
- [ ] Identify and map remaining custom fields

## 🚀 Future Enhancements

### 1. Contact Management UX
- [ ] **Contact Selector**: Better navigation between org members vs event attendees
- [ ] **Bulk Operations**: Select multiple contacts for actions
- [ ] **Contact History**: Show event attendance history
- [ ] **Contact Notes**: Rich text notes with timestamps

### 2. Event Management
- [ ] **Event Pipeline**: Track attendees through stages
- [ ] **Event Analytics**: Attendance rates, engagement metrics
- [ ] **Event Templates**: Reusable event configurations
- [ ] **Event Check-in**: QR code or manual check-in system

### 3. Communication System
- [ ] **Email Templates**: Rich text email templates with variables
- [ ] **SMS Integration**: Text message campaigns
- [ ] **Automated Sequences**: Drip campaigns based on behavior
- [ ] **Communication History**: Track all touchpoints

### 4. Analytics & Reporting
- [ ] **Engagement Metrics**: Track member engagement over time
- [ ] **Event Performance**: Attendance rates, revenue tracking
- [ ] **Contact Growth**: New member acquisition metrics
- [ ] **Campaign Effectiveness**: Email open rates, click rates

## 📋 Migration Priority

### Phase 1: Core Architecture (Week 1)
1. LeadershipRole FK migration
2. Engagement FK migration
3. Event relationship simplification

### Phase 2: Contact Management (Week 2)
1. Contact list architecture
2. Bulk operations
3. Contact selector UX improvements

### Phase 3: Communication (Week 3)
1. SendGrid integration
2. Email template system
3. Campaign management

### Phase 4: Analytics (Week 4)
1. Basic reporting
2. Engagement tracking
3. Event analytics

## 🔧 Technical Debt

### 1. Database Optimizations
- [ ] Add proper indexes for frequently queried fields
- [ ] Optimize complex joins (OrgMember → Contact → EventAttendees → Event)
- [ ] Consider denormalization for performance-critical queries

### 2. Code Organization
- [ ] Consolidate similar routes (orgMembersHydrateRoute vs orgMemberUpdateRoute)
- [ ] Create shared utilities for common operations
- [ ] Standardize error handling across all routes

### 3. Frontend Architecture
- [ ] Create reusable components for common UI patterns
- [ ] Implement proper loading states
- [ ] Add error boundaries and fallback UI

## 📝 Notes

- **Universal Personhood**: Contact model represents the person, OrgMember represents the relationship to the organization
- **Event Relationships**: Currently complex, needs simplification for better performance
- **Reference Tables**: All integer-based reference tables are seeded automatically
- **Inline Editing**: All fields support inline editing with immediate save
- **Phone Formatting**: Consistent formatting across all phone number displays

---

**Last Updated**: October 13th, 2024
**Status**: In Progress - Core architecture improvements underway

