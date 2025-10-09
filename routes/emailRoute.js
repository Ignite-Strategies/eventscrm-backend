import express from "express";
import verifyGmailToken from "../middleware/verifyFirebaseToken.js";
import { GmailService } from "../services/gmailService.js";
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// POST /email/send - Send single email
router.post("/send", verifyGmailToken, async (req, res) => {
  try {
    const { to, subject, body, templateId, variables } = req.body;
    const { gmailAccessToken } = req; // From Gmail token

    if (!to || !subject || !body) {
      return res.status(400).json({ 
        error: "to, subject, and body are required" 
      });
    }

    // If using a template, load and process it
    let emailSubject = subject;
    let emailBody = body;

    if (templateId) {
      const template = await prisma.template.findUnique({
        where: { id: templateId }
      });
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      emailSubject = template.subject;
      emailBody = template.body;

      // Replace template variables
      if (variables) {
        Object.keys(variables).forEach(key => {
          const placeholder = `{{${key}}}`;
          emailSubject = emailSubject.replace(new RegExp(placeholder, 'g'), variables[key]);
          emailBody = emailBody.replace(new RegExp(placeholder, 'g'), variables[key]);
        });
      }

      // Increment template usage
      await prisma.template.update({
        where: { id: templateId },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date()
        }
      });
    }

    // Initialize Gmail service
    const gmailService = new GmailService(gmailAccessToken);

    // Send email
    const result = await gmailService.sendEmail({
      to,
      subject: emailSubject,
      body: emailBody,
      fromName: "F3 Events"
    });

    res.json({ 
      success: true, 
      messageId: result.messageId,
      templateUsed: templateId ? true : false
    });

  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /email/send-bulk - Send bulk emails (campaign)
router.post("/send-bulk", verifyGmailToken, async (req, res) => {
  try {
    const { recipients, subject, body, templateId, variables } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ 
        error: "recipients array is required" 
      });
    }

    // If using a template, load and process it
    let emailSubject = subject;
    let emailBody = body;

    if (templateId) {
      const template = await prisma.template.findUnique({
        where: { id: templateId }
      });
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      emailSubject = template.subject;
      emailBody = template.body;

      // Increment template usage
      await prisma.template.update({
        where: { id: templateId },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date()
        }
      });
    }

    // Initialize Gmail service
    const gmailService = new GmailService(gmailAccessToken);

    // Prepare emails with personalized variables
    const emails = recipients.map(recipient => {
      let personalizedSubject = emailSubject;
      let personalizedBody = emailBody;

      // Replace template variables with recipient data
      if (variables && recipient.variables) {
        Object.keys(recipient.variables).forEach(key => {
          const placeholder = `{{${key}}}`;
          personalizedSubject = personalizedSubject.replace(new RegExp(placeholder, 'g'), recipient.variables[key]);
          personalizedBody = personalizedBody.replace(new RegExp(placeholder, 'g'), recipient.variables[key]);
        });
      }

      return {
        to: recipient.email,
        subject: personalizedSubject,
        body: personalizedBody,
        fromName: "F3 Events"
      };
    });

    // Send bulk emails
    const results = await gmailService.sendBulkEmails(emails);

    res.json({
      success: true,
      totalSent: results.success.length,
      totalErrors: results.errors.length,
      results: results
    });

  } catch (error) {
    console.error("Error sending bulk emails:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /email/templates - Get available templates for email composition
router.get("/templates", verifyGmailToken, async (req, res) => {
  try {
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }

    const templates = await prisma.template.findMany({ 
      where: {
        orgId, 
        isActive: true,
        type: { in: ["email", "invitation", "reminder", "follow_up"] }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(templates);
  } catch (error) {
    console.error("Error fetching email templates:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
