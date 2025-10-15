import Bull from 'bull';
import { getPrismaClient } from "../config/database.js";
import { GmailService } from "./personalEmailService.js";

const prisma = getPrismaClient();

/**
 * Email Scheduling Service
 * Handles delayed sends and drip sequences
 * 
 * BREADCRUMBS FOR FUTURE:
 * 1. Install Redis locally or use cloud Redis (Upstash, Redis Cloud)
 * 2. Uncomment Bull queue code below
 * 3. Add SequenceSchedule table to Prisma schema
 * 4. Hook up to cron job in index.js
 */

// ==========================================
// BULL QUEUE SETUP (Future - Needs Redis)
// ==========================================

// Uncomment when you have Redis running:
/*
const emailQueue = new Bull('email-scheduling', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  }
});

// Process jobs from the queue
emailQueue.process(async (job) => {
  const { contactId, sequenceId, gmailToken } = job.data;
  
  console.log(`📧 Processing scheduled email for contact ${contactId}`);
  
  // Get sequence and contact
  const sequence = await prisma.sequence.findUnique({
    where: { id: sequenceId }
  });
  
  const contact = await prisma.contact.findUnique({
    where: { id: contactId }
  });
  
  if (!sequence || !contact) {
    throw new Error('Sequence or contact not found');
  }
  
  // Send the email
  const gmailService = new GmailService(gmailToken);
  await gmailService.sendEmail({
    to: contact.email,
    subject: sequence.subject.replace(/\{\{firstName\}\}/g, contact.firstName),
    body: sequence.html.replace(/\{\{firstName\}\}/g, contact.firstName),
    fromName: "Adam - F3 Capital Impact"
  });
  
  console.log(`✅ Sent scheduled email to ${contact.email}`);
  
  return { success: true, sentTo: contact.email };
});
*/

class SchedulingService {
  
  /**
   * SIMPLE VERSION: Schedule an email for later (without Redis)
   * Stores in database, cron job will check and send
   */
  static async scheduleEmailSimple({
    contactId,
    sequenceId,
    sendAt, // timestamp or Date object
    gmailToken
  }) {
    try {
      // For now, just log it - you'll need to add SequenceSchedule table
      console.log('📅 Scheduling email (simple mode - no Redis yet):');
      console.log(`   Contact: ${contactId}`);
      console.log(`   Sequence: ${sequenceId}`);
      console.log(`   Send at: ${sendAt}`);
      
      // FUTURE: Store in SequenceSchedule table
      /*
      await prisma.sequenceSchedule.create({
        data: {
          contactId,
          sequenceId,
          sendAt: new Date(sendAt),
          status: 'pending',
          gmailToken // encrypted in production!
        }
      });
      */
      
      return {
        success: true,
        scheduledFor: sendAt,
        message: 'Email scheduled (simple mode)'
      };
      
    } catch (error) {
      console.error('❌ Schedule error:', error);
      throw error;
    }
  }
  
  /**
   * BULL VERSION: Schedule with Redis queue (future)
   */
  static async scheduleEmailWithBull({
    contactId,
    sequenceId,
    sendAt,
    gmailToken
  }) {
    // Uncomment when Redis is ready:
    /*
    const delayMs = new Date(sendAt).getTime() - Date.now();
    
    await emailQueue.add(
      {
        contactId,
        sequenceId,
        gmailToken
      },
      {
        delay: delayMs, // Bull will wait this long before processing
        attempts: 3, // Retry up to 3 times if it fails
        backoff: {
          type: 'exponential',
          delay: 5000 // Wait 5s, then 10s, then 20s between retries
        }
      }
    );
    
    return {
      success: true,
      scheduledFor: sendAt,
      message: 'Email scheduled with Bull'
    };
    */
    
    console.log('⚠️ Bull scheduling requires Redis - using simple mode instead');
    return this.scheduleEmailSimple({ contactId, sequenceId, sendAt, gmailToken });
  }
  
  /**
   * Schedule a drip sequence
   * Example: Email 1 today, Email 2 in 3 days, Email 3 in 7 days
   */
  static async scheduleDripSequence({
    contactId,
    campaignId,
    sequences, // Array of { sequenceId, delayDays }
    gmailToken
  }) {
    try {
      console.log(`📧 Scheduling drip sequence for contact ${contactId}`);
      
      const scheduled = [];
      const now = new Date();
      
      for (const seq of sequences) {
        const sendAt = new Date(now.getTime() + (seq.delayDays * 24 * 60 * 60 * 1000));
        
        // Schedule each email
        const result = await this.scheduleEmailSimple({
          contactId,
          sequenceId: seq.sequenceId,
          sendAt,
          gmailToken
        });
        
        scheduled.push({
          sequenceId: seq.sequenceId,
          sendAt,
          delayDays: seq.delayDays
        });
      }
      
      return {
        success: true,
        totalScheduled: scheduled.length,
        schedule: scheduled
      };
      
    } catch (error) {
      console.error('❌ Drip sequence error:', error);
      throw error;
    }
  }
  
  /**
   * Check for emails that need to be sent (called by cron)
   */
  static async processScheduledEmails() {
    try {
      console.log('🔍 Checking for scheduled emails...');
      
      // FUTURE: Query SequenceSchedule table
      /*
      const dueEmails = await prisma.sequenceSchedule.findMany({
        where: {
          status: 'pending',
          sendAt: {
            lte: new Date() // Send time is now or in the past
          }
        },
        include: {
          contact: true,
          sequence: true
        }
      });
      
      console.log(`📬 Found ${dueEmails.length} emails to send`);
      
      for (const scheduledEmail of dueEmails) {
        try {
          // Send the email
          const gmailService = new GmailService(scheduledEmail.gmailToken);
          await gmailService.sendEmail({
            to: scheduledEmail.contact.email,
            subject: scheduledEmail.sequence.subject.replace(/\{\{firstName\}\}/g, scheduledEmail.contact.firstName),
            body: scheduledEmail.sequence.html.replace(/\{\{firstName\}\}/g, scheduledEmail.contact.firstName)
          });
          
          // Mark as sent
          await prisma.sequenceSchedule.update({
            where: { id: scheduledEmail.id },
            data: {
              status: 'sent',
              sentAt: new Date()
            }
          });
          
          console.log(`✅ Sent scheduled email to ${scheduledEmail.contact.email}`);
          
          // Wait 4 seconds before next email (Gmail friendly)
          await new Promise(resolve => setTimeout(resolve, 4000));
          
        } catch (error) {
          console.error(`❌ Failed to send to ${scheduledEmail.contact.email}:`, error);
          
          // Mark as failed
          await prisma.sequenceSchedule.update({
            where: { id: scheduledEmail.id },
            data: {
              status: 'failed',
              error: error.message
            }
          });
        }
      }
      
      return {
        success: true,
        processed: dueEmails.length
      };
      */
      
      console.log('⚠️ No SequenceSchedule table yet - add to schema first');
      return { success: true, processed: 0 };
      
    } catch (error) {
      console.error('❌ Process scheduled emails error:', error);
      throw error;
    }
  }
  
  /**
   * Cancel a scheduled email
   */
  static async cancelScheduledEmail(scheduleId) {
    // FUTURE:
    /*
    await prisma.sequenceSchedule.update({
      where: { id: scheduleId },
      data: { status: 'cancelled' }
    });
    */
    
    console.log(`🚫 Cancelled schedule ${scheduleId} (when table exists)`);
    return { success: true };
  }
}

export default SchedulingService;

