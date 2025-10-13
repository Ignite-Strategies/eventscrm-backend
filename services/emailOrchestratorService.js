import { getPrismaClient } from "../config/database.js";
import ContactListService from "./contactListService.js";

const prisma = getPrismaClient();

/**
 * Email Orchestrator Service
 * The Container that brings together: List + Template + Schedule
 */
class EmailOrchestratorService {
  
  /**
   * Orchestrate an email send
   * This is the main entry point - coordinates everything
   */
  static async orchestrate({
    orgId,
    contactListId,
    templateId = null,
    customContent = null,
    sendType = "immediate",
    scheduledFor = null,
    timezone = "America/Chicago",
    delaySeconds = 2,
    variables = {}
  }) {
    
    // 1. VALIDATE WHO (Contact List)
    const contactList = await this.validateContactList(contactListId);
    
    // 2. VALIDATE WHAT (Template or Custom Content)
    const emailContent = await this.resolveEmailContent(
      templateId, 
      customContent, 
      variables
    );
    
    // 3. GET CONTACTS
    const contacts = await ContactListService.getContactsForList(contactListId);
    const sendableContacts = this.filterSendableContacts(contacts);
    
    if (sendableContacts.length === 0) {
      throw new Error("No sendable contacts in list");
    }
    
    // 4. CREATE SEND JOB
    const sendJob = await prisma.sendJob.create({
      data: {
        orgId,
        contactListId,
        templateId,
        subject: emailContent.subject,
        html: emailContent.html,
        sendType,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        timezone,
        delaySeconds,
        status: sendType === "immediate" ? "pending" : "scheduled",
        totalContacts: sendableContacts.length,
        sentCount: 0,
        failedCount: 0
      }
    });
    
    console.log(`📦 Orchestrated send job ${sendJob.id}: ${sendableContacts.length} contacts`);
    
    // 5. EXECUTE OR SCHEDULE
    if (sendType === "immediate") {
      // Send immediately (async, don't wait)
      this.executeJob(sendJob.id).catch(err => {
        console.error("Error executing immediate job:", err);
      });
      
      return {
        jobId: sendJob.id,
        status: "sending",
        totalContacts: sendableContacts.length,
        message: "Sending started"
      };
    } else {
      // Schedule for later
      return {
        jobId: sendJob.id,
        status: "scheduled",
        scheduledFor: sendJob.scheduledFor,
        totalContacts: sendableContacts.length,
        message: `Scheduled for ${scheduledFor}`
      };
    }
  }
  
  /**
   * Validate contact list exists and is active
   */
  static async validateContactList(contactListId) {
    const list = await prisma.contactList.findUnique({
      where: { id: contactListId }
    });
    
    if (!list) {
      throw new Error("Contact list not found");
    }
    
    if (!list.isActive) {
      throw new Error("Contact list is not active");
    }
    
    return list;
  }
  
  /**
   * Resolve email content from template or custom
   */
  static async resolveEmailContent(templateId, customContent, variables) {
    let subject, html;
    
    if (templateId) {
      // Use template
      const template = await prisma.template.findUnique({
        where: { id: templateId }
      });
      
      if (!template) {
        throw new Error("Template not found");
      }
      
      subject = template.subject;
      html = template.body;
      
      // Track template usage
      await prisma.template.update({
        where: { id: templateId },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date()
        }
      });
      
    } else if (customContent) {
      // Use custom content
      subject = customContent.subject;
      html = customContent.html;
      
    } else {
      throw new Error("Either templateId or customContent is required");
    }
    
    // Replace global variables (not contact-specific)
    if (variables) {
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, variables[key]);
        html = html.replace(regex, variables[key]);
      });
    }
    
    return { subject, html };
  }
  
  /**
   * Filter out contacts that can't receive emails
   */
  static filterSendableContacts(contacts) {
    return contacts.filter(contact => {
      // Must have email
      if (!contact.email) return false;
      
      // Basic email validation
      if (!contact.email.includes('@')) return false;
      
      // TODO: Check opt-out list
      // TODO: Check bounce list
      
      return true;
    });
  }
  
  /**
   * Execute a send job (actually send the emails)
   * This gets called immediately OR by scheduler later
   */
  static async executeJob(jobId) {
    // This will be implemented in enterpriseEmailRoute
    // Marking as stub for now
    console.log(`🚀 Execute job ${jobId} - will be handled by enterprise-email route`);
  }
  
  /**
   * Get job status
   */
  static async getJobStatus(jobId) {
    const job = await prisma.sendJob.findUnique({
      where: { id: jobId },
      include: {
        contactList: {
          select: { name: true }
        },
        template: {
          select: { name: true }
        }
      }
    });
    
    if (!job) {
      throw new Error("Job not found");
    }
    
    // Calculate progress
    const progress = job.totalContacts > 0 
      ? Math.round((job.sentCount / job.totalContacts) * 100)
      : 0;
    
    // Estimate completion time
    let estimatedCompletion = null;
    if (job.status === "sending" && job.startedAt) {
      const elapsed = Date.now() - new Date(job.startedAt).getTime();
      const avgTimePerEmail = elapsed / job.sentCount;
      const remaining = job.totalContacts - job.sentCount;
      const estimatedMs = remaining * avgTimePerEmail;
      estimatedCompletion = new Date(Date.now() + estimatedMs);
    }
    
    return {
      id: job.id,
      status: job.status,
      contactList: job.contactList.name,
      template: job.template?.name || "Custom",
      totalContacts: job.totalContacts,
      sentCount: job.sentCount,
      failedCount: job.failedCount,
      progress,
      scheduledFor: job.scheduledFor,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      estimatedCompletion
    };
  }
  
  /**
   * Cancel a job
   */
  static async cancelJob(jobId) {
    const job = await prisma.sendJob.findUnique({
      where: { id: jobId }
    });
    
    if (!job) {
      throw new Error("Job not found");
    }
    
    if (job.status === "completed") {
      throw new Error("Cannot cancel completed job");
    }
    
    await prisma.sendJob.update({
      where: { id: jobId },
      data: {
        status: "cancelled",
        completedAt: new Date()
      }
    });
    
    return {
      message: "Job cancelled",
      sentCount: job.sentCount,
      cancelledCount: job.totalContacts - job.sentCount
    };
  }
}

export default EmailOrchestratorService;

