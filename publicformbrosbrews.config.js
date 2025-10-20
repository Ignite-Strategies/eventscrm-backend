/**
 * PUBLIC FORM - BROS & BREWS CONFIG
 * 
 * This config contains the critical IDs for the Bros & Brews form
 * to prevent losing them during development/deployment.
 * 
 * Last Updated: December 2024
 */

export const BROS_BREWS_FORM_CONFIG = {
  // Form IDs
  formId: 'cmgitzsgz0001q2298133p9it',
  slug: 'bros-brews',
  title: 'Soft Commit for Bros & Brews',
  
  // Tenant Isolation
  containerId: 'cmgu7w02h0000ceaqt7iz6bf9',  // F3 CRM Container
  
  // Event & Organization
  eventId: 'cmggljv7z0002nt28gckp1jpe',
  orgId: 'cmgfvz9v10000nt284k875eoc',
  
  // Form Configuration
  audienceType: 'org_members',
  targetStage: 'rsvp',
  
  // API Endpoints
  hydrateUrl: '/api/forms/public/event/cmggljv7z0002nt28gckp1jpe',
  submitUrl: '/api/forms/public/submit',
  
  // Frontend Route
  frontendRoute: '/forms/event/cmggljv7z0002nt28gckp1jpe',
  
  // Description
  description: 'Fill out the below so we know you\'re coming or at least thinking of coming. It will help as we manage our space at Port City Brewing.'
};

export default BROS_BREWS_FORM_CONFIG;
