import express from "express";
import { getPrismaClient } from "../config/database.js";
import ContactListService from "../services/contactListService.js";
import { GmailService } from "../services/personalEmailService.js";

const router = express.Router();
const prisma = getPrismaClient();

/**
 * POST /enterprise-gmail/send-sequence
 * Send a configured sequence via Gmail API with 4-second delays
 */
router.post("/send-sequence", async (req, res) => {
  try {
    const { sequenceId, contacts, delaySeconds = 4 } = req.body;
    
    if (!sequenceId || !contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: "sequenceId and contacts array are required" });
    }
    
    // 1. Get sequence details
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId }
    });
    
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    
    // 2. Use contacts passed from frontend (FRONTEND CONTROLS THE DATA!)
    if (contacts.length === 0) {
      return res.status(400).json({ error: "No contacts provided" });
    }
    
    console.log(`🚀 Sending sequence "${sequence.name}" to ${contacts.length} contacts via Gmail API`);
    
    // 3. Get Gmail access token (you'll need to implement this)
    // For now, we'll need to get the user's Gmail token
    const accessToken = await getGmailAccessToken(); // TODO: Implement this
    
    if (!accessToken) {
      return res.status(401).json({ error: "Gmail authentication required" });
    }
    
    // 4. Initialize Gmail service
    const gmailService = new GmailService(accessToken);
    
    // 5. Send emails with delays
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        // Personalize email
        const personalizedSubject = sequence.subject.replace(/\{\{firstName\}\}/g, contact.firstName);
        const personalizedBody = sequence.html.replace(/\{\{firstName\}\}/g, contact.firstName);
        
        // Send via Gmail
        const result = await gmailService.sendEmail({
          to: contact.email,
          subject: personalizedSubject,
          body: personalizedBody,
          fromName: "Adam - F3 Capital Impact"
        });
        
        successCount++;
        results.push({
          contactId: contact.id,
          email: contact.email,
          status: 'sent',
          messageId: result.messageId
        });
        
        console.log(`✅ Sent to ${contact.email} (${i + 1}/${contacts.length})`);
        
        // Add delay between sends (except for the last one)
        if (i < contacts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
        
      } catch (error) {
        errorCount++;
        results.push({
          contactId: contact.id,
          email: contact.email,
          status: 'error',
          error: error.message
        });
        
        console.error(`❌ Failed to send to ${contact.email}:`, error.message);
      }
    }
    
    // 6. Update sequence status
    await prisma.sequence.update({
      where: { id: sequenceId },
      data: { 
        status: 'completed',
        sentAt: new Date(),
        totalSent: successCount
      }
    });
    
    console.log(`🎯 Sequence complete: ${successCount} sent, ${errorCount} failed`);
    
    res.json({
      success: true,
      message: `Sequence sent to ${successCount} contacts`,
      results: {
        total: contacts.length,
        sent: successCount,
        failed: errorCount,
        details: results
      }
    });
    
  } catch (error) {
    console.error("Error sending sequence via Gmail:", error);
    res.status(500).json({ error: error.message });
  }
});

// TODO: Implement Gmail access token retrieval
async function getGmailAccessToken() {
  // This needs to be implemented based on your auth system
  // Could be from a user's stored token, or require re-authentication
  return null; // Placeholder
}

export default router;
