import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class SendGridService {
  
  /**
   * Send bulk emails via SendGrid Mail API
   */
  static async sendBulkEmails({ contacts, subject, html, campaignId, sequenceId }) {
    try {
      console.log(`📧 Sending bulk emails to ${contacts.length} contacts`);
      
      // SendGrid can handle up to 1000 recipients per request
      const batchSize = 1000;
      const batches = [];
      
      for (let i = 0; i < contacts.length; i += batchSize) {
        batches.push(contacts.slice(i, i + batchSize));
      }
      
      const results = [];
      
      for (const batch of batches) {
        const personalizations = batch.map(contact => ({
          to: [{ email: contact.email, name: `${contact.firstName} ${contact.lastName}` }],
          custom_args: {
            campaign_id: campaignId,
            sequence_id: sequenceId,
            contact_id: contact.id
          },
          // Dynamic substitutions (e.g., {{firstName}})
          dynamic_template_data: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email
          }
        }));
        
        const msg = {
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || 'adam@f3capitalimpact.org',
            name: process.env.SENDGRID_FROM_NAME || 'F3 Capital Impact'
          },
          subject,
          html,
          personalizations,
          tracking_settings: {
            click_tracking: { enable: true, enable_text: true },
            open_tracking: { enable: true }
          }
        };
        
        try {
          const response = await sgMail.send(msg);
          console.log(`✅ Batch sent: ${batch.length} emails`);
          results.push({
            success: true,
            count: batch.length,
            response: response[0].statusCode
          });
        } catch (error) {
          console.error('❌ Error sending batch:', error);
          results.push({
            success: false,
            count: batch.length,
            error: error.message
          });
        }
      }
      
      const totalSuccess = results.filter(r => r.success).reduce((sum, r) => sum + r.count, 0);
      const totalFailed = results.filter(r => !r.success).reduce((sum, r) => sum + r.count, 0);
      
      console.log(`📊 Bulk send complete: ${totalSuccess} sent, ${totalFailed} failed`);
      
      return {
        totalSent: totalSuccess,
        totalFailed: totalFailed,
        batches: results
      };
      
    } catch (error) {
      console.error('❌ SendGrid bulk send error:', error);
      throw new Error(`Failed to send bulk emails: ${error.message}`);
    }
  }
  
  /**
   * Send single email via SendGrid
   */
  static async sendEmail({ to, subject, html, fromEmail, fromName }) {
    try {
      const msg = {
        to,
        from: {
          email: fromEmail || process.env.SENDGRID_FROM_EMAIL || 'adam@f3capitalimpact.org',
          name: fromName || process.env.SENDGRID_FROM_NAME || 'F3 Capital Impact'
        },
        subject,
        html,
        tracking_settings: {
          click_tracking: { enable: true, enable_text: true },
          open_tracking: { enable: true }
        }
      };
      
      const response = await sgMail.send(msg);
      console.log(`✅ Email sent to ${to}`);
      
      return {
        success: true,
        messageId: response[0].headers['x-message-id']
      };
      
    } catch (error) {
      console.error('❌ SendGrid send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}

export default SendGridService;

