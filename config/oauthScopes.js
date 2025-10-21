/**
 * Centralized OAuth Scope Configuration
 * All Google API scopes in one place for consistency
 */

export const OAUTH_SCOPES = {
  // 🧭 Unified Google OAuth Scopes (EngageSmart)
  GMAIL: [
    'https://www.googleapis.com/auth/gmail.send', // Send emails
    'https://www.googleapis.com/auth/gmail.readonly' // Read emails for better UX
  ],
  
  YOUTUBE: [
    'https://www.googleapis.com/auth/youtube.upload', // Upload videos
    'https://www.googleapis.com/auth/youtube.readonly', // Read channel data
    'https://www.googleapis.com/auth/youtube.force-ssl' // HTTPS-only access
  ],
  
  ADS: [
    'https://www.googleapis.com/auth/adwords' // Google Ads API - full access
    // NOTE: Requires Google Ads Developer Token verification for production use
  ],
  
  // Future services
  GOOGLE_DRIVE: [
    'https://www.googleapis.com/auth/drive.file' // Access files created by app
  ],
  
  GOOGLE_CALENDAR: [
    'https://www.googleapis.com/auth/calendar' // Full calendar access
  ]
};

/**
 * Get scopes for a specific service
 * @param {string} service - Service name (GMAIL, YOUTUBE, etc.)
 * @returns {string[]} Array of scope URLs
 */
export function getScopesForService(service) {
  return OAUTH_SCOPES[service] || [];
}

/**
 * Get all scopes for multiple services
 * @param {string[]} services - Array of service names
 * @returns {string[]} Combined array of scope URLs
 */
export function getScopesForServices(services) {
  return services.reduce((allScopes, service) => {
    return [...allScopes, ...getScopesForService(service)];
  }, []);
}
