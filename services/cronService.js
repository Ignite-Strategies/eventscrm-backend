import cron from 'node-cron';
import SchedulingService from './schedulingService.js';

/**
 * Cron Jobs Service
 * Runs scheduled tasks in the background
 * 
 * CRON SYNTAX:
 * ┌────────────── second (optional, 0-59)
 * │ ┌──────────── minute (0-59)
 * │ │ ┌────────── hour (0-23)
 * │ │ │ ┌──────── day of month (1-31)
 * │ │ │ │ ┌────── month (1-12)
 * │ │ │ │ │ ┌──── day of week (0-6, Sunday=0)
 * │ │ │ │ │ │
 * * * * * * *
 * 
 * Examples:
 * '* * * * *'        - Every minute
 * '*/5 * * * *'      - Every 5 minutes
 * '0 * * * *'        - Every hour at minute 0
 * '0 9 * * *'        - Every day at 9:00 AM
 * '0 9 * * 1'        - Every Monday at 9:00 AM
 * '0 0 1 * *'        - First day of every month at midnight
 */

class CronService {
  
  static jobs = [];
  
  /**
   * Start all cron jobs
   */
  static start() {
    console.log('⏰ Starting cron jobs...');
    
    // Check for scheduled emails every minute
    const emailCheckJob = cron.schedule('* * * * *', async () => {
      console.log('🔍 [CRON] Checking scheduled emails...');
      try {
        await SchedulingService.processScheduledEmails();
      } catch (error) {
        console.error('❌ [CRON] Email check failed:', error);
      }
    });
    
    this.jobs.push({
      name: 'scheduled-email-check',
      schedule: '* * * * *', // Every minute
      job: emailCheckJob
    });
    
    // FUTURE: Add more cron jobs here
    // Example: Daily metrics sync
    /*
    const metricsSyncJob = cron.schedule('0 9 * * *', async () => {
      console.log('📊 [CRON] Syncing Google Ads metrics...');
      // await GoogleAdsService.syncAllCampaigns(orgId);
    });
    
    this.jobs.push({
      name: 'google-ads-sync',
      schedule: '0 9 * * *', // Every day at 9 AM
      job: metricsSyncJob
    });
    */
    
    console.log(`✅ Started ${this.jobs.length} cron job(s)`);
    this.jobs.forEach(j => {
      console.log(`   - ${j.name}: ${j.schedule}`);
    });
  }
  
  /**
   * Stop all cron jobs
   */
  static stop() {
    console.log('⏹️ Stopping cron jobs...');
    this.jobs.forEach(j => {
      j.job.stop();
    });
    this.jobs = [];
  }
  
  /**
   * List active cron jobs
   */
  static list() {
    return this.jobs.map(j => ({
      name: j.name,
      schedule: j.schedule
    }));
  }
}

export default CronService;

