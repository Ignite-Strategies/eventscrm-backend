# SendGrid Email Testing Guide

## 🚀 Quick Start

Navigate to: `/test-email` in your frontend

---

## 📧 Single Email Test

1. **Fill in form:**
   - To Email: `your@email.com`
   - To Name: `Your Name`
   - Subject: `Test Email`
   - Text: Plain text version
   - HTML: HTML version

2. **Click "Send Test Email"**

3. **Check result:**
   - ✅ Success: Shows message ID and status
   - ❌ Error: Shows error details

---

## 📬 Batch Email Test

1. **Enter multiple emails** (one per line or comma-separated):
   ```
   test1@example.com
   test2@example.com
   test3@example.com
   ```

2. **Set delay** (default: 4 seconds between emails)

3. **Click "Send Batch Emails"**

4. **Watch progress:**
   - Real-time status updates
   - Success/failure for each email
   - Duration tracking

---

## ⚙️ Backend Setup

### Environment Variables

Add to `.env` file:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Your Company Name
```

### Get SendGrid API Key

1. Go to https://sendgrid.com
2. Sign up or log in
3. Navigate to Settings → API Keys
4. Create new API key with "Mail Send" permission
5. Copy key to `.env`

### Verify Sender Email

**Important:** SendGrid requires sender verification

1. Go to SendGrid → Settings → Sender Authentication
2. Add your sender email
3. Verify email via confirmation link
4. Or use domain authentication (recommended for production)

---

## 🔍 Testing Checklist

### Before Sending

- [ ] SendGrid API key configured
- [ ] Sender email verified in SendGrid
- [ ] Backend server running
- [ ] Frontend connected to backend

### First Test

- [ ] Send to your own email
- [ ] Check inbox (and spam folder)
- [ ] Verify HTML rendering
- [ ] Check tracking (opens/clicks if enabled)

### Batch Test

- [ ] Test with 2-3 emails first
- [ ] Verify delay between sends
- [ ] Check all emails received
- [ ] Monitor SendGrid dashboard for metrics

---

## 📊 API Endpoints

### POST `/api/test-email/send`

Send single email

**Request:**
```json
{
  "toEmail": "recipient@example.com",
  "toName": "Recipient Name",
  "subject": "Test Subject",
  "text": "Plain text content",
  "html": "<p>HTML content</p>"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "xxxxx",
  "statusCode": 202,
  "duration": "145ms"
}
```

### POST `/api/test-email/batch`

Send batch emails with delay

**Request:**
```json
{
  "emails": [
    "test1@example.com",
    "test2@example.com"
  ],
  "subject": "Test Subject",
  "text": "Plain text",
  "html": "<p>HTML</p>",
  "delaySeconds": 4
}
```

**Response:**
```json
{
  "success": true,
  "total": 2,
  "sent": 2,
  "failed": 0,
  "results": [...]
}
```

### GET `/api/test-email/config`

Check SendGrid configuration

**Response:**
```json
{
  "configured": true,
  "apiKeySet": "SG.xxxxxxx...",
  "fromEmail": "noreply@yourdomain.com",
  "fromName": "Your Company"
}
```

---

## 🐛 Troubleshooting

### "SendGrid API key not configured"

**Solution:** Add `SENDGRID_API_KEY` to `.env` file and restart backend

### "Error 401: Unauthorized"

**Cause:** Invalid API key

**Solution:** 
1. Check API key is correct
2. Verify key has "Mail Send" permission
3. Generate new key if needed

### "Error 403: Forbidden"

**Cause:** Sender email not verified

**Solution:**
1. Go to SendGrid → Sender Authentication
2. Verify sender email
3. Use verified email in `SENDGRID_FROM_EMAIL`

### Emails not arriving

**Check:**
1. Spam folder
2. SendGrid Activity Feed (in dashboard)
3. Email address typos
4. Recipient email server not blocking

### "Error 429: Too Many Requests"

**Cause:** Rate limit exceeded

**Solution:**
1. Increase delay between emails
2. Check SendGrid plan limits
3. Upgrade SendGrid plan if needed

---

## 📈 Rate Limits

### SendGrid Free Tier
- **100 emails/day**
- Good for testing

### SendGrid Essentials
- **50,000 emails/month**
- ~$20/month

### SendGrid Pro
- **100,000+ emails/month**
- Custom pricing

### Recommended Delays

- **Testing:** 4-5 seconds between emails
- **Production (small batches):** 2-3 seconds
- **Production (large batches):** Use SendGrid batch API

---

## 🎯 Next Steps

After successful testing:

1. ✅ Verify emails deliver correctly
2. ✅ Test HTML rendering
3. ✅ Check tracking works (opens/clicks)
4. ✅ Test batch sending with delays
5. 🚀 Integrate into campaign system

---

## 🔧 Code Examples

### Frontend Call (React)

```javascript
const response = await api.post("/test-email/send", {
  toEmail: "recipient@example.com",
  toName: "Recipient",
  subject: "Test",
  text: "Plain text",
  html: "<p>HTML</p>"
});
```

### Backend Implementation

```javascript
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: "recipient@example.com",
  from: "sender@yourdomain.com",
  subject: "Test",
  text: "Plain text",
  html: "<p>HTML</p>"
};

await sgMail.send(msg);
```

---

## 🎨 HTML Email Tips

### Use Inline CSS
```html
<p style="color: #333; font-size: 16px;">
  Text here
</p>
```

### Use Tables for Layout
```html
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td>Content here</td>
  </tr>
</table>
```

### Include Plain Text
Always provide both HTML and plain text versions

### Test Across Clients
- Gmail
- Outlook
- Apple Mail
- Mobile devices

---

## 📝 Production Checklist

Before going live:

- [ ] Domain authentication configured
- [ ] DKIM/SPF records set
- [ ] Unsubscribe link added
- [ ] Privacy policy included
- [ ] CAN-SPAM compliance verified
- [ ] Rate limiting implemented
- [ ] Error handling robust
- [ ] Bounce handling configured
- [ ] Monitoring/alerts set up

---

*Last Updated: October 13, 2025*
*Status: ✅ Ready for Testing*


