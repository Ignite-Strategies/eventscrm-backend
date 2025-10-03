# CSV Upload Format

## Required Fields

1. **name** - Full name (required)
2. **email** - Email address (required, must be unique per org)

## Optional Fields

3. **phone** - Phone number
4. **type** - Supporter type: `individual`, `family`, `corporate`, `foundation` (default: individual)
5. **tags** - Comma-separated tags in quotes (e.g., "f3:ao,monthly_donor,vip")

---

## Sample CSV Template

```csv
name,email,phone,type,tags
John Doe,john@example.com,555-1234,individual,"f3:ao,monthly_donor"
Jane Smith,jane@example.com,555-5678,individual,"community:leader,volunteer"
Acme Corp,contact@acme.com,555-9999,corporate,"sponsor,local_business"
The Smith Family,smiths@example.com,555-0000,family,"family_member"
```

---

## Field Validation

### Email
- Must be valid format (contains @ and .)
- Must be unique within organization
- Automatically converted to lowercase

### Name
- Required, cannot be blank
- Minimum 2 characters

### Phone
- Optional
- Any format accepted (will be stored as-is)

### Type
- Must be one of: `individual`, `family`, `corporate`, `foundation`
- If blank or invalid, defaults to `individual`

### Tags
- Optional
- Comma-separated within quotes
- Example: `"f3:ao,role:sponsor,monthly_donor"`
- Spaces around commas are trimmed

---

## Upload Process

1. **Parse CSV** - Read file and extract rows
2. **Validate each row**:
   - Check required fields (name, email)
   - Validate email format
   - Validate type enum
   - Parse tags
3. **Return errors** if validation fails
4. **Upsert supporters**:
   - If email exists → update record
   - If new email → create new supporter
5. **Return results**: inserted count, updated count, errors

---

## Error Handling

**Common Errors:**

```
Line 5: Missing email
Line 12: Invalid email format (must contain @ and .)
Line 8: Duplicate email within CSV
```

**Response Format:**
```json
{
  "success": true,
  "inserted": 45,
  "updated": 5,
  "total": 50,
  "errors": []
}
```

**If errors:**
```json
{
  "error": "CSV parsing errors",
  "details": [
    { "line": 5, "error": "Missing email" },
    { "line": 12, "error": "Invalid email format" }
  ]
}
```

---

## Download Template

**Frontend should provide a "Download Template" button:**

Generates a CSV file with headers:
```csv
name,email,phone,type,tags
Example Person,example@email.com,555-0000,individual,"f3:ao,monthly_donor"
```

---

## Recommended Tags

**F3 Members:**
- `f3:ao` - F3 AO (Area of Operation)
- `f3:q` - F3 Q (Workout Leader)
- `f3:member` - General F3 member

**Donor Types:**
- `monthly_donor`
- `major_donor` - Large donations
- `legacy_donor` - Estate planning
- `first_time_donor`

**Engagement:**
- `volunteer`
- `event_champion`
- `board_member`
- `committee_member`

**Roles:**
- `role:sponsor`
- `role:influencer`
- `role:community_leader`

**Relationship:**
- `friend_family` - Friend of org member
- `business_owner`
- `nonprofit_partner`

---

## API Endpoint

```
POST /api/orgs/:orgId/supporters/csv
Content-Type: multipart/form-data

Body: file (CSV)
```

**Response on success:**
```json
{
  "success": true,
  "inserted": 100,
  "updated": 25,
  "total": 125
}
```

---

## Best Practices

1. **Clean your data first** - Remove duplicates, fix email typos
2. **Use consistent tags** - Decide on tag naming convention
3. **Test with small batch** - Upload 5-10 rows first to verify format
4. **Keep backup** - Save original CSV before uploading
5. **Review after upload** - Check the supporters table to verify data

---

**Questions?** Check the csvService.js for validation logic.

