# 🚀 Google Ads Connection Demo

Simple demo of the OAuth popup flow for connecting Google Ads accounts.

## What This Is

A **prototype** of the real Google Ads OAuth flow using:
- Fake credentials (name@gmail.com / hardcodedpw)
- postMessage communication (popup → parent window)
- Demo tokens (not real Google tokens)

## How to Run

### 1. Start Backend
```bash
cd GOOGLE-ADS-DEMO
npm install
npm run server
```

Server runs on http://localhost:4000

### 2. Add Component to Frontend

Copy `ConnectGoogleAds.jsx` to your frontend `src/pages/` folder.

Add route in `App.jsx`:
```javascript
<Route path="/demo/google-ads" element={<ConnectGoogleAds />} />
```

### 3. Test It

1. Go to http://localhost:5173/demo/google-ads (or your frontend URL)
2. Click "Connect Google Ads"
3. Popup opens
4. Enter: `name@gmail.com` / `hardcodedpw`
5. Popup sends tokens to parent via postMessage
6. Popup closes
7. Parent shows "Connected" with token details

## The Flow

```
Parent Window (ConnectGoogleAds.jsx)
  ↓ Opens popup
Popup (/auth/popup)
  ↓ User enters credentials
Backend (/auth/fake validates)
  ↓ Returns fake tokens
Popup (postMessage to parent)
  ↓ Parent receives tokens
Parent Window (shows "Connected")
Popup (closes)
```

## Next Steps (Real OAuth)

When ready to use real Google OAuth:

1. Replace `/auth/popup` with Google's OAuth URL
2. Replace `/auth/fake` with real token exchange
3. Add Google Client ID/Secret to env
4. Use googleapis package for token management
5. Store refresh_token in database (GoogleAdAccount table)

**This demo proves the UX works!**

## Files

- `server.js` - Express backend with fake auth
- `public/auth-popup.html` - Popup login page
- `ConnectGoogleAds.jsx` - React component
- `package.json` - Dependencies

## Integration

To integrate into main app:

1. Move `/auth/popup` route to main backend (index.js)
2. Move `ConnectGoogleAds.jsx` to `src/pages/RecruitGoogle.jsx`
3. Replace hardcoded port with env var
4. Add "Connect" button to Google Ads page

**Clean demo → Real OAuth is just swapping endpoints!** 🎯

