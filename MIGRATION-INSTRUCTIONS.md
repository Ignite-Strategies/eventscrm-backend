# Database Migration Instructions

## Prerequisites
Make sure your `.env` file has a valid `DATABASE_URL` set:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

## Run Migration

```bash
cd eventscrm-backend
npx prisma migrate dev --name massive-day-features
npx prisma generate
```

## What This Migration Adds

### Organization Model
- `googleAdsConfig` - Stores Google Ads OAuth credentials
- `metaConfig` - Stores Meta/Facebook Page credentials

### Sequence Model
- `totalSent` - Tracks total emails sent

### AdCampaign Model
- `googleAdsId` - Google Ads campaign resource name
- `metaAdsId` - Meta/Facebook campaign ID
- `platform` - Campaign platform (Manual, Google, Meta)

## If Migration Fails

If the migration fails, you can manually add these fields to your schema and retry.

Or you can run:
```bash
npx prisma db push
```

This will push schema changes without creating a migration file.

## After Migration

Restart your backend server:
```bash
npm start
```

All new features will be available!

