# Deployment Configuration

## Environment Variables Setup

### Vercel (Frontend) Environment Variables:
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### Render (Backend) Environment Variables:
```bash
# Database
SUPPORTER_DB=mongodb+srv://username:password@cluster.mongodb.net/impact_events

# Firebase/Google OAuth
GOOGLE_CLIENT_SECRET={"web":{"client_id":"your-client-id","project_id":"ignite-events-crm","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"your-client-secret","redirect_uris":["https://ignitestrategescrm-frontend.vercel.app"]}}

# URLs
FRONTEND_URL=https://ignitestrategescrm-frontend.vercel.app
PAY_BACKEND_URL=your-payment-backend-url
```

## OAuth Redirect URIs
Make sure these are configured in Google Cloud Console:
- `https://ignitestrategescrm-frontend.vercel.app` (production)
- `http://localhost:3000` (development)

## Gmail API Scopes
Required scopes in Google Cloud Console:
- `https://www.googleapis.com/auth/gmail.send`

## Testing
1. Deploy frontend to Vercel
2. Deploy backend to Render
3. Update Firebase authorized domains with your Vercel URL
4. Test Google sign-in
5. Test email sending
