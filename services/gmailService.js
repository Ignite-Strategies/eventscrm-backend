import { google } from 'googleapis';

// Gmail API service for sending emails
export class GmailService {
  constructor(accessToken) {
    this.oauth2Client = new google.auth.OAuth2();
    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  // Send email using Gmail API
  async sendEmail({ to, subject, body, fromName = "F3 Events" }) {
    try {
      // Create email message
      const message = this.createMessage({ to, subject, body, fromName });
      
      // Send email
      const result = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message
        }
      });

      console.log('✅ Email sent successfully:', result.data.id);
      return { success: true, messageId: result.data.id };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Create properly formatted email message
  createMessage({ to, subject, body, fromName }) {
    const boundary = '----=_Part_' + Math.random().toString(36).substr(2, 9);
    
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text version
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      body,
      ``,
      `--${boundary}--`
    ].join('\n');

    // Encode message in base64url format
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Send bulk emails (for campaigns)
  async sendBulkEmails(emails) {
    const results = { success: [], errors: [] };
    
    for (const email of emails) {
      try {
        const result = await this.sendEmail(email);
        results.success.push({ ...email, messageId: result.messageId });
      } catch (error) {
        results.errors.push({ ...email, error: error.message });
      }
    }
    
    return results;
  }
}

// Helper function to get Gmail service from Firebase token
export function getGmailService(firebaseToken) {
  // In a real implementation, you'd exchange the Firebase token for a Gmail access token
  // For now, we'll assume the Firebase token has Gmail scope
  return new GmailService(firebaseToken);
}
