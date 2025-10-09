# Check PublicForm Save - SQL Queries

Run these in pgAdmin to verify what saved where:

## 1. Check PublicForm table
```sql
SELECT * FROM "PublicForm" ORDER BY "createdAt" DESC LIMIT 5;
```

## 2. Check EventForm table
```sql
SELECT * FROM "EventForm" ORDER BY "createdAt" DESC LIMIT 5;
```

## 3. Check CustomField table (linked to PublicForm)
```sql
SELECT * FROM "CustomField" ORDER BY "createdAt" DESC LIMIT 10;
```

## 4. Check the relationships
```sql
SELECT 
  pf.id as public_form_id,
  pf.slug,
  pf.title,
  pf."audienceType",
  pf."targetStage",
  ef.id as event_form_id,
  ef."internalName",
  COUNT(cf.id) as custom_field_count
FROM "PublicForm" pf
LEFT JOIN "EventForm" ef ON ef."publicFormId" = pf.id
LEFT JOIN "CustomField" cf ON cf."publicFormId" = pf.id
GROUP BY pf.id, ef.id
ORDER BY pf."createdAt" DESC
LIMIT 5;
```

## Expected Results:
- **PublicForm**: Should have slug, title, audienceType, targetStage, collectName/Email/Phone flags
- **EventForm**: Should have publicFormId, internalName, internalPurpose
- **CustomField**: Should have publicFormId (NOT eventFormId!), all custom field data
- **Relationship**: EventForm.publicFormId should match PublicForm.id, CustomField.publicFormId should match PublicForm.id

## If something's wrong:
- Check if PublicForm table even exists (might need migration!)
- Check if CustomField.publicFormId exists (might be eventFormId still)
- Check if data is in old EventForm table instead

