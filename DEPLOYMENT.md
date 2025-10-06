# 🚀 Deployment Guide

## First-Time Database Setup (Render)

### Step 1: Create Database Schema

In Render shell, run:
```bash
npx prisma db push --accept-data-loss
```

This creates all tables from `prisma/schema.prisma`.

### Step 2: Seed Initial Data

Still in Render shell:
```bash
npm run db:seed
```

This will:
- ✅ Create Ignite Strategies organization
- ✅ Create admin user
- ✅ Output the Org ID for your frontend

### Step 3: Update Frontend Environment Variables

Copy the `VITE_ORG_ID` from the seed output and add it to your Vercel environment variables:

```
VITE_ORG_ID=<the-id-from-seed-output>
```

Redeploy frontend.

---

## Subsequent Deployments

Normal deployments just need:
```bash
git push origin main
```

The `postinstall` hook will automatically run `npx prisma generate` to update the Prisma client.

---

## Local Development Setup

1. Create `.env` file:
```env
DATABASE_URL="postgresql://..."
FIREBASE_PROJECT_ID="your-project-id"
PORT=3001
```

2. Push schema to local database:
```bash
npx prisma db push
```

3. Seed local database:
```bash
npm run db:seed
```

4. Start dev server:
```bash
npm run dev
```

---

## Prisma Commands Reference

| Command | Description |
|---------|-------------|
| `npx prisma db push` | Sync schema to database (no migration files) |
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma studio` | Open Prisma Studio (DB GUI) |
| `npm run db:seed` | Seed database with initial data |

---

## Database Schema Changes

When you modify `prisma/schema.prisma`:

1. **Development**: `npx prisma db push`
2. **Production (Render)**: Run in Render shell → `npx prisma db push`
3. **Redeploy**: Both environments will auto-generate client on next deploy

---

## Troubleshooting

### "Table does not exist"
Run: `npx prisma db push --accept-data-loss`

### "Org ID not found"
Run: `npm run db:seed` to create organization

### "DATABASE_URL not set"
Check Render environment variables or local `.env` file
