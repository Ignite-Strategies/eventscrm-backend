# Form Data Reference

## Public Forms

| ID | Slug | Title | Active | Event ID | Org ID | Created |
|---|---|---|---|---|---|---|
| `cmgitzsgz0001q2298133p9it` | `bros-brews` | Soft Commit for Bros & Brews | TRUE | `cmggljv7z0002nt28gckp1jpe` | `cmgfvz9v10000nt284k875eoc` | 01:37.4 |

## Form Submission Endpoint

**New Route:** `POST /api/event-attendees/form-submission`

**Form ID:** `cmgitzsgz0001q2298133p9it`
**Event ID:** `cmggljv7z0002nt28gckp1jpe` (Bros & Brews)
**Org ID:** `cmgfvz9v10000nt284k875eoc`

## Next Steps

1. ✅ **Route renamed** from `/api/contacts` to `/api/event-attendees/form-submission`
2. ✅ **FormUserUpdate.jsx created** - Load form by ID, choose contact, map form response to structured fields
3. 📊 **View actual form responses** in EventAttendee.notes (JSON)

## FormUserUpdate Page

**URL:** `/form-user-update`

**Features:**
- Select form from dropdown
- View all attendees who submitted that form
- Click attendee to see their raw form response (JSON)
- Auto-map common fields:
  - `bringing_m` → `spouseOrOther`
  - `how_many_in_party` → `howManyInParty` 
  - `how_likely_to_attend` → `likelihoodToAttendId`
- Save mapped data to EventAttendee record

---

**Last Updated:** October 13, 2025
