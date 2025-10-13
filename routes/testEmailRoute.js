import express from "express";
import sgMail from "@sendgrid/mail";

const router = express.Router();

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log("✅ SendGrid initialized for test emails");
} else {
  console.warn("⚠️ SENDGRID_API_KEY not found - email testing will fail");
}

/**
 * POST /test-email/send
 * Send a single test email through SendGrid
 */
router.post("/send", async (req, res) => {
  try {
    const {
      toEmail,
      toName = "",
      subject = "Test Email",
      text = "This is a test email.",
      html = "<p>This is a test email.</p>"
    } = req.body;
    
    // Validation
    if (!toEmail) {
      return res.status(400).json({ error: "toEmail is required" });
    }
    
    if (!SENDGRID_API_KEY) {
      return res.status(500).json({ 
        error: "SendGrid API key not configured. Set SENDGRID_API_KEY environment variable." 
      });
    }
    
    // Get sender email from env or use default
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@ignitestrategies.com";
    const fromName = process.env.SENDGRID_FROM_NAME || "Ignite Strategies CRM";
    
    // Prepare email
    const msg = {
      to: {
        email: toEmail,
        name: toName || toEmail.split('@')[0]
      },
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: subject,
      text: text,
      html: html,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };
    
    console.log(`📧 Sending test email to ${toEmail}...`);
    console.log(`   From: ${fromName} <${fromEmail}>`);
    console.log(`   Subject: ${subject}`);
    
    // Send via SendGrid
    const startTime = Date.now();
    const response = await sgMail.send(msg);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Email sent successfully in ${duration}ms`);
    console.log(`   Status Code: ${response[0].statusCode}`);
    console.log(`   Message ID: ${response[0].headers['x-message-id']}`);
    
    res.json({
      success: true,
      message: "Email sent successfully",
      statusCode: response[0].statusCode,
      messageId: response[0].headers['x-message-id'],
      duration: `${duration}ms`,
      to: toEmail,
      from: fromEmail,
      subject: subject
    });
    
  } catch (error) {
    console.error("❌ Error sending test email:", error);
    
    // SendGrid specific error handling
    if (error.response) {
      const { body, statusCode } = error.response;
      console.error(`   SendGrid Error: ${statusCode}`);
      console.error(`   Details:`, body);
      
      return res.status(statusCode).json({
        error: "SendGrid API error",
        statusCode: statusCode,
        details: body.errors || body
      });
    }
    
    res.status(500).json({
      error: error.message || "Failed to send email"
    });
  }
});

/**
 * POST /test-email/batch
 * Send batch test emails with delay
 */
router.post("/batch", async (req, res) => {
  try {
    const {
      emails = [],
      subject = "Test Email",
      text = "This is a test email.",
      html = "<p>This is a test email.</p>",
      delaySeconds = 4
    } = req.body;
    
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "emails array is required" });
    }
    
    if (!SENDGRID_API_KEY) {
      return res.status(500).json({ 
        error: "SendGrid API key not configured" 
      });
    }
    
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@ignitestrategies.com";
    const fromName = process.env.SENDGRID_FROM_NAME || "Ignite Strategies CRM";
    
    console.log(`📧 Sending batch of ${emails.length} emails with ${delaySeconds}s delay...`);
    
    const results = [];
    
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      try {
        const msg = {
          to: email,
          from: { email: fromEmail, name: fromName },
          subject: subject,
          text: text,
          html: html
        };
        
        const startTime = Date.now();
        const response = await sgMail.send(msg);
        const duration = Date.now() - startTime;
        
        results.push({
          email,
          status: "success",
          statusCode: response[0].statusCode,
          messageId: response[0].headers['x-message-id'],
          duration: `${duration}ms`
        });
        
        console.log(`  ✅ ${i + 1}/${emails.length} sent to ${email} (${duration}ms)`);
        
      } catch (error) {
        results.push({
          email,
          status: "failed",
          error: error.message
        });
        
        console.error(`  ❌ ${i + 1}/${emails.length} failed for ${email}:`, error.message);
      }
      
      // Delay before next email (except last one)
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }
    
    const successCount = results.filter(r => r.status === "success").length;
    
    console.log(`✅ Batch complete: ${successCount}/${emails.length} sent`);
    
    res.json({
      success: true,
      total: emails.length,
      sent: successCount,
      failed: emails.length - successCount,
      results
    });
    
  } catch (error) {
    console.error("❌ Error sending batch emails:", error);
    res.status(500).json({
      error: error.message || "Failed to send batch emails"
    });
  }
});

/**
 * GET /test-email/config
 * Check SendGrid configuration
 */
router.get("/config", (req, res) => {
  res.json({
    configured: !!SENDGRID_API_KEY,
    apiKeySet: SENDGRID_API_KEY ? `${SENDGRID_API_KEY.substring(0, 10)}...` : null,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "noreply@ignitestrategies.com",
    fromName: process.env.SENDGRID_FROM_NAME || "Ignite Strategies CRM"
  });
});

export default router;

