import express from "express";
import sgMail from "@sendgrid/mail";
import { getPrismaClient } from "../config/database.js";
import ContactListOrchestrator from "../services/contactListOrchestrator.js";

const router = express.Router();
const prisma = getPrismaClient();

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@ignitestrategies.com";
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "Ignite Strategies";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log("✅ SendGrid initialized for enterprise email");
} else {
  console.warn("⚠️ SENDGRID_API_KEY not configured - enterprise email will fail");
}

/**
 * POST /enterprise-email/send-single
 * Send immediate email to one recipient (testing/1:1 outreach)
 */
router.post("/send-single", async (req, res) => {
  try {
    const {
      toEmail,
      toName,
      subject,
      html,
      text
    } = req.body;
    
    if (!toEmail || !subject || !html) {
      return res.status(400).json({ 
        error: "toEmail, subject, and html are required" 
      });
    }
    
    if (!SENDGRID_API_KEY) {
      return res.status(500).json({ 
        error: "SendGrid not configured. Set SENDGRID_API_KEY in environment." 
      });
    }
    
    const msg = {
      to: { email: toEmail, name: toName || toEmail.split('@')[0] },
      from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text fallback
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };
    
    console.log(`📧 Sending enterprise email to ${toEmail}...`);
    const response = await sgMail.send(msg);
    
    console.log(`✅ Email sent successfully`);
    
    res.json({
      success: true,
      messageId: response[0].headers['x-message-id'],
      statusCode: response[0].statusCode,
      to: toEmail
    });
    
  } catch (error) {
    console.error("❌ Error sending enterprise email:", error);
    
    if (error.response) {
      return res.status(error.response.statusCode).json({
        error: "SendGrid error",
        details: error.response.body
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /enterprise-email/send-campaign
 * Send email to everyone in a campaign's contact list
 */
router.post("/send-campaign", async (req, res) => {
  try {
    const {
      campaignId,
      subject,
      html,
      text,
      delaySeconds = 0 // Delay between emails (rate limiting)
    } = req.body;
    
    if (!campaignId || !subject || !html) {
      return res.status(400).json({ 
        error: "campaignId, subject, and html are required" 
      });
    }
    
    if (!SENDGRID_API_KEY) {
      return res.status(500).json({ 
        error: "SendGrid not configured" 
      });
    }
    
    // Get campaign with contact list
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        contactList: true
      }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    if (!campaign.contactListId) {
      return res.status(400).json({ error: "Campaign has no contact list" });
    }
    
    // Get contacts from list
    const contacts = await ContactListOrchestrator.getContactListWithContacts(
      campaign.contactListId
    );
    
    if (contacts.length === 0) {
      return res.status(400).json({ error: "No contacts in list" });
    }
    
    console.log(`📧 Sending campaign "${campaign.name}" to ${contacts.length} contacts...`);
    
    const results = {
      total: contacts.length,
      sent: 0,
      failed: 0,
      details: []
    };
    
    // Send to each contact
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        // Personalize email
        let personalizedSubject = subject;
        let personalizedHtml = html;
        let personalizedText = text || html.replace(/<[^>]*>/g, '');
        
        // Replace variables
        const variables = {
          firstName: contact.firstName || contact.goesBy || 'Friend',
          lastName: contact.lastName || '',
          email: contact.email,
          goesBy: contact.goesBy || contact.firstName || 'Friend'
        };
        
        Object.keys(variables).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          personalizedSubject = personalizedSubject.replace(regex, variables[key]);
          personalizedHtml = personalizedHtml.replace(regex, variables[key]);
          personalizedText = personalizedText.replace(regex, variables[key]);
        });
        
        const msg = {
          to: { 
            email: contact.email, 
            name: contact.goesBy || contact.firstName || 'Friend'
          },
          from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
          subject: personalizedSubject,
          html: personalizedHtml,
          text: personalizedText,
          trackingSettings: {
            clickTracking: { enable: true },
            openTracking: { enable: true }
          }
        };
        
        const response = await sgMail.send(msg);
        
        results.sent++;
        results.details.push({
          email: contact.email,
          status: "sent",
          messageId: response[0].headers['x-message-id']
        });
        
        console.log(`  ✅ ${i + 1}/${contacts.length} sent to ${contact.email}`);
        
        // Create EmailEvent record for tracking
        await prisma.emailEvent.create({
          data: {
            contactId: contact.id,
            campaignId: campaign.id,
            type: "sent",
            timestamp: new Date()
          }
        });
        
      } catch (error) {
        results.failed++;
        results.details.push({
          email: contact.email,
          status: "failed",
          error: error.message
        });
        
        console.error(`  ❌ ${i + 1}/${contacts.length} failed for ${contact.email}`);
      }
      
      // Delay between emails (rate limiting)
      if (delaySeconds > 0 && i < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }
    
    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { 
        status: results.sent > 0 ? "sent" : "failed",
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Campaign complete: ${results.sent}/${results.total} sent`);
    
    res.json({
      success: true,
      campaign: campaign.name,
      ...results
    });
    
  } catch (error) {
    console.error("❌ Error sending campaign:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /enterprise-email/send-list
 * Send email to everyone in a contact list (no campaign needed)
 */
router.post("/send-list", async (req, res) => {
  try {
    const {
      contactListId,
      subject,
      html,
      text,
      delaySeconds = 0
    } = req.body;
    
    if (!contactListId || !subject || !html) {
      return res.status(400).json({ 
        error: "contactListId, subject, and html are required" 
      });
    }
    
    if (!SENDGRID_API_KEY) {
      return res.status(500).json({ 
        error: "SendGrid not configured" 
      });
    }
    
    // Get contact list
    const contactList = await prisma.contactList.findUnique({
      where: { id: contactListId }
    });
    
    if (!contactList) {
      return res.status(404).json({ error: "Contact list not found" });
    }
    
    // Get contacts
    const contacts = await ContactListOrchestrator.getContactListWithContacts(contactListId);
    
    if (contacts.length === 0) {
      return res.status(400).json({ error: "No contacts in list" });
    }
    
    console.log(`📧 Sending to list "${contactList.name}" (${contacts.length} contacts)...`);
    
    const results = {
      total: contacts.length,
      sent: 0,
      failed: 0,
      details: []
    };
    
    // Send to each contact
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        // Personalize email
        let personalizedSubject = subject;
        let personalizedHtml = html;
        let personalizedText = text || html.replace(/<[^>]*>/g, '');
        
        const variables = {
          firstName: contact.firstName || contact.goesBy || 'Friend',
          lastName: contact.lastName || '',
          email: contact.email,
          goesBy: contact.goesBy || contact.firstName || 'Friend'
        };
        
        Object.keys(variables).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          personalizedSubject = personalizedSubject.replace(regex, variables[key]);
          personalizedHtml = personalizedHtml.replace(regex, variables[key]);
          personalizedText = personalizedText.replace(regex, variables[key]);
        });
        
        const msg = {
          to: { 
            email: contact.email, 
            name: contact.goesBy || contact.firstName || 'Friend'
          },
          from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
          subject: personalizedSubject,
          html: personalizedHtml,
          text: personalizedText,
          trackingSettings: {
            clickTracking: { enable: true },
            openTracking: { enable: true }
          }
        };
        
        const response = await sgMail.send(msg);
        
        results.sent++;
        results.details.push({
          email: contact.email,
          status: "sent",
          messageId: response[0].headers['x-message-id']
        });
        
        console.log(`  ✅ ${i + 1}/${contacts.length} sent to ${contact.email}`);
        
      } catch (error) {
        results.failed++;
        results.details.push({
          email: contact.email,
          status: "failed",
          error: error.message
        });
        
        console.error(`  ❌ ${i + 1}/${contacts.length} failed for ${contact.email}`);
      }
      
      // Delay between emails
      if (delaySeconds > 0 && i < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }
    
    // Update list usage
    await prisma.contactList.update({
      where: { id: contactListId },
      data: {
        usageCount: { increment: 1 },
        lastUsed: new Date()
      }
    });
    
    console.log(`✅ List email complete: ${results.sent}/${results.total} sent`);
    
    res.json({
      success: true,
      list: contactList.name,
      ...results
    });
    
  } catch (error) {
    console.error("❌ Error sending to list:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /enterprise-email/send-sequence
 * Send a configured sequence to its contacts
 * This is the LAUNCHER - executes what was built in /api/sequences
 */
router.post("/send-sequence", async (req, res) => {
  try {
    const {
      sequenceId,
      delaySeconds = 2
    } = req.body;
    
    if (!sequenceId) {
      return res.status(400).json({ error: "sequenceId is required" });
    }
    
    if (!SENDGRID_API_KEY) {
      return res.status(500).json({ error: "SendGrid not configured" });
    }
    
    // Get sequence with all related data
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId },
      include: {
        campaign: {
          include: {
            contactList: true
          }
        }
      }
    });
    
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    
    if (!sequence.campaign.contactListId) {
      return res.status(400).json({ error: "Campaign has no contact list" });
    }
    
    // Get contacts from list
    const contacts = await ContactListOrchestrator.getContactListWithContacts(
      sequence.campaign.contactListId
    );
    
    // Filter out contacts who already responded in previous sequences
    let eligibleContacts = contacts;
    
    if (sequence.order > 1) {
      const respondedContacts = await prisma.sequenceContact.findMany({
        where: {
          contactId: { in: contacts.map(c => c.id) },
          sequence: {
            campaignId: sequence.campaignId,
            order: { lt: sequence.order }
          },
          status: { in: ["responded", "registered"] }
        },
        select: { contactId: true }
      });
      
      const respondedIds = new Set(respondedContacts.map(sc => sc.contactId));
      eligibleContacts = contacts.filter(c => !respondedIds.has(c.id));
      
      console.log(`📊 Filtered ${respondedIds.size} responded contacts from sequence ${sequence.order}`);
    }
    
    if (eligibleContacts.length === 0) {
      return res.status(400).json({ error: "No eligible contacts for this sequence" });
    }
    
    console.log(`🚀 Launching sequence "${sequence.name}" to ${eligibleContacts.length} contacts...`);
    
    const results = {
      total: eligibleContacts.length,
      sent: 0,
      failed: 0,
      details: []
    };
    
    // Send to each contact
    for (let i = 0; i < eligibleContacts.length; i++) {
      const contact = eligibleContacts[i];
      
      try {
        // Personalize email
        let personalizedSubject = sequence.subject;
        let personalizedHtml = sequence.html;
        
        const variables = {
          firstName: contact.firstName || contact.goesBy || 'Friend',
          lastName: contact.lastName || '',
          email: contact.email,
          goesBy: contact.goesBy || contact.firstName || 'Friend'
        };
        
        Object.keys(variables).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          personalizedSubject = personalizedSubject.replace(regex, variables[key]);
          personalizedHtml = personalizedHtml.replace(regex, variables[key]);
        });
        
        const msg = {
          to: { 
            email: contact.email, 
            name: contact.goesBy || contact.firstName || 'Friend'
          },
          from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
          subject: personalizedSubject,
          html: personalizedHtml,
          trackingSettings: {
            clickTracking: { enable: true },
            openTracking: { enable: true }
          }
        };
        
        const response = await sgMail.send(msg);
        
        results.sent++;
        results.details.push({
          email: contact.email,
          status: "sent",
          messageId: response[0].headers['x-message-id']
        });
        
        console.log(`  ✅ ${i + 1}/${eligibleContacts.length} sent to ${contact.email}`);
        
        // Create SequenceContact record
        await prisma.sequenceContact.upsert({
          where: {
            sequenceId_contactId: {
              sequenceId: sequence.id,
              contactId: contact.id
            }
          },
          create: {
            sequenceId: sequence.id,
            contactId: contact.id,
            status: "sent",
            sentAt: new Date()
          },
          update: {
            status: "sent",
            sentAt: new Date()
          }
        });
        
        // Create EmailEvent for tracking
        await prisma.emailEvent.create({
          data: {
            contactId: contact.id,
            campaignId: sequence.campaignId,
            type: "sent",
            timestamp: new Date()
          }
        });
        
      } catch (error) {
        results.failed++;
        results.details.push({
          email: contact.email,
          status: "failed",
          error: error.message
        });
        
        console.error(`  ❌ ${i + 1}/${eligibleContacts.length} failed for ${contact.email}`);
        
        // Record failure
        await prisma.sequenceContact.upsert({
          where: {
            sequenceId_contactId: {
              sequenceId: sequence.id,
              contactId: contact.id
            }
          },
          create: {
            sequenceId: sequence.id,
            contactId: contact.id,
            status: "failed"
          },
          update: {
            status: "failed"
          }
        });
      }
      
      // Delay between emails (rate limiting)
      if (delaySeconds > 0 && i < eligibleContacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }
    
    // Update sequence status
    await prisma.sequence.update({
      where: { id: sequenceId },
      data: { 
        status: results.sent > 0 ? "sent" : "failed",
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Sequence complete: ${results.sent}/${results.total} sent`);
    
    res.json({
      success: true,
      sequence: sequence.name,
      campaign: sequence.campaign.name,
      ...results
    });
    
  } catch (error) {
    console.error("❌ Error sending sequence:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /enterprise-email/config
 * Check SendGrid configuration
 */
router.get("/config", (req, res) => {
  res.json({
    configured: !!SENDGRID_API_KEY,
    fromEmail: SENDGRID_FROM_EMAIL,
    fromName: SENDGRID_FROM_NAME,
    provider: "SendGrid"
  });
});

export default router;

