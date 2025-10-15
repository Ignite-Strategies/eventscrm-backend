import express from "express";
import { getPrismaClient } from "../config/database.js";
import ContactListService from "../services/contactListService.js";
import { GmailService } from "../services/personalEmailService.js";
import verifyGmailToken from "../middleware/verifyGmailToken.js";
import StageMovementService from "../services/stageMovementService.js";
import FileUploadService from "../services/fileUploadService.js";

const router = express.Router();
const prisma = getPrismaClient();

/**
 * POST /enterprise-gmail/send-sequence
 * Send a configured sequence via Gmail API with 4-second delays
 */
router.post("/send-sequence", verifyGmailToken, async (req, res) => {
  console.log('🎯 /send-sequence route called');
  
  try {
    const { sequenceId, contacts, delaySeconds = 4 } = req.body;
    const gmailAccessToken = req.gmailAccessToken; // From Gmail OAuth middleware
    
    console.log('📨 Request body:', { 
      sequenceId, 
      contactCount: contacts?.length,
      delaySeconds 
    });
    console.log('🔑 Gmail token from middleware:', {
      exists: !!gmailAccessToken,
      tokenStart: gmailAccessToken?.substring(0, 20) + '...',
      tokenLength: gmailAccessToken?.length
    });
    
    if (!sequenceId || !contacts || !Array.isArray(contacts)) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ error: "sequenceId and contacts array are required" });
    }
    
    if (!gmailAccessToken) {
      console.error('❌ No Gmail token available');
      return res.status(401).json({ error: "Gmail authentication required" });
    }
    
    // 1. Get sequence details
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId }
    });
    
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    
    // 1.5. Load campaign attachments if this sequence belongs to a campaign
    let attachments = [];
    if (sequence.campaignId) {
      const campaignFiles = await FileUploadService.getCampaignFiles(sequence.campaignId);
      console.log('📎 Loading attachments for campaign:', campaignFiles.length);
      
      // Convert to Gmail attachment format
      attachments = campaignFiles.map(file => {
        const fileContent = FileUploadService.getFileContent(file.filePath);
        return {
          filename: file.originalName,
          content: fileContent,
          contentType: file.mimeType
        };
      });
    }
    
    // 2. Use contacts passed from frontend (FRONTEND CONTROLS THE DATA!)
    if (contacts.length === 0) {
      return res.status(400).json({ error: "No contacts provided" });
    }
    
    console.log(`🚀 Sending sequence "${sequence.name}" to ${contacts.length} contacts via Gmail API`);
    
    // 3. Initialize Gmail service
    const gmailService = new GmailService(gmailAccessToken);
    
    // 5. Send emails with delays
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        // Personalize email with ALL available fields
        const personalizedSubject = sequence.subject
          .replace(/\{\{firstName\}\}/g, contact.firstName || '')
          .replace(/\{\{lastName\}\}/g, contact.lastName || '')
          .replace(/\{\{goesBy\}\}/g, contact.goesBy || contact.firstName || '')
          .replace(/\{\{email\}\}/g, contact.email || '');
          
        const personalizedBody = sequence.html
          .replace(/\{\{firstName\}\}/g, contact.firstName || '')
          .replace(/\{\{lastName\}\}/g, contact.lastName || '')
          .replace(/\{\{goesBy\}\}/g, contact.goesBy || contact.firstName || '')
          .replace(/\{\{email\}\}/g, contact.email || '');
        
        // Send via Gmail with attachments
        const result = await gmailService.sendEmail({
          to: contact.email,
          subject: personalizedSubject,
          body: personalizedBody,
          fromName: "Adam Cole - F3 Capital Impact",
          attachments: attachments
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
    
    // 7. AUTO-MOVE CONTACTS TO NEXT STAGE! 🚀
    try {
      const sentContactIds = results
        .filter(r => r.status === 'sent')
        .map(r => r.contactId);
      
      if (sentContactIds.length > 0) {
        const moveResult = await StageMovementService.moveContactsAfterEmail(
          sequenceId,
          sentContactIds
        );
        console.log(`📊 Auto-movement: ${moveResult.moved} contacts moved to next stage`);
      }
    } catch (moveError) {
      console.error('⚠️ Stage movement failed (non-critical):', moveError);
      // Don't fail the whole request if movement fails
    }
    
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

/**
 * POST /enterprise-gmail/send-campaign
 * Send a campaign via Gmail API
 */
router.post("/send-campaign", verifyGmailToken, async (req, res) => {
  console.log('🎯 /send-campaign route called');
  
  try {
    const { campaignId, subject, message, contactListId } = req.body;
    const gmailAccessToken = req.gmailAccessToken;
    
    console.log('📨 Campaign request:', { campaignId, subject, contactListId });
    
    if (!campaignId || !subject || !message || !contactListId) {
      return res.status(400).json({ error: "campaignId, subject, message, and contactListId are required" });
    }
    
    if (!gmailAccessToken) {
      return res.status(401).json({ error: "Gmail authentication required" });
    }
    
    // Get contacts from the contact list
    const contacts = await ContactListService.getContactsForList(contactListId);
    
    // Load campaign attachments
    const campaignFiles = await FileUploadService.getCampaignFiles(campaignId);
    console.log('📎 Loading attachments for campaign:', campaignFiles.length);
    
    // Convert to Gmail attachment format
    const attachments = campaignFiles.map(file => {
      const fileContent = FileUploadService.getFileContent(file.filePath);
      return {
        filename: file.originalName,
        content: fileContent,
        contentType: file.mimeType
      };
    });
    
    if (contacts.length === 0) {
      return res.status(400).json({ error: "No contacts in list" });
    }
    
    console.log(`🚀 Sending campaign "${subject}" to ${contacts.length} contacts via Gmail API`);
    
    // Initialize Gmail service
    const gmailService = new GmailService(gmailAccessToken);
    
    // Send emails with delays
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        // Personalize email with ALL available fields
        const personalizedSubject = subject
          .replace(/\{\{firstName\}\}/g, contact.firstName || '')
          .replace(/\{\{lastName\}\}/g, contact.lastName || '')
          .replace(/\{\{goesBy\}\}/g, contact.goesBy || contact.firstName || '')
          .replace(/\{\{email\}\}/g, contact.email || '');
          
        const personalizedMessage = message
          .replace(/\{\{firstName\}\}/g, contact.firstName || '')
          .replace(/\{\{lastName\}\}/g, contact.lastName || '')
          .replace(/\{\{goesBy\}\}/g, contact.goesBy || contact.firstName || '')
          .replace(/\{\{email\}\}/g, contact.email || '');
        
        // Send via Gmail with attachments
        const result = await gmailService.sendEmail({
          to: contact.email,
          subject: personalizedSubject,
          body: personalizedMessage,
          fromName: "Adam Cole - F3 Capital Impact",
          attachments: attachments
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
          await new Promise(resolve => setTimeout(resolve, 4000)); // 4 second delay
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
    
    console.log(`🎯 Campaign complete: ${successCount} sent, ${errorCount} failed`);
    
    // CRITICAL: Only mark as sent if at least 1 email went through!
    if (successCount === 0) {
      console.error('❌ CAMPAIGN FAILED: 0 emails sent!');
      return res.status(500).json({ 
        error: `Campaign failed: All ${errorCount} emails failed to send. Check Gmail authentication.`,
        results: {
          total: contacts.length,
          sent: 0,
          failed: errorCount,
          details: results
        }
      });
    }
    
    // Update campaign status (only if we actually sent emails!)
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { 
        status: 'sent',
        subject,
        body: message
      }
    });
    
    // Return success with stats
    res.json({
      success: true,
      message: `Campaign sent to ${successCount} contacts${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
      results: {
        total: contacts.length,
        sent: successCount,
        failed: errorCount,
        details: results
      }
    });
    
  } catch (error) {
    console.error("Error sending campaign via Gmail:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
