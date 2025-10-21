/**
 * Master Keys Configuration
 * 
 * This file contains ALL the critical IDs used throughout the system.
 * These are the master keys that everything else references.
 */

export const MASTER_KEYS_CONFIG = {
  // Organization ID (for org member filtering)
  ORG_ID: 'cmgfvz9v10000nt284k875eoc',
  
  // Admin ID (for admin operations)
  ADMIN_ID: 'admin_432599718',
  
  // Container ID (for contact grouping)
  CONTAINER_ID: 'cmgu7w02h0000ceaqt7iz6bf9',
  
  // Event ID (for event attendee filtering)
  EVENT_ID: 'cmggljv7z0002nt28gckp1jpe', // Bros & Brews event
  
  // Google OAuth Connection ID (for Gmail/YouTube/Ads connections)
  GOOGLE_AUTH_CONNECTION_ID: 'kdrzuhtrx4xjtyqdzclw0815',
  
  // Container name for display
  CONTAINER_NAME: 'F3 CRM',
  
  // Container slug for URLs
  CONTAINER_SLUG: 'f3-crm',
  
  // Admin email
  ADMIN_EMAIL: 'adam.cole.novadude@gmail.com'
};

export default MASTER_KEYS_CONFIG;