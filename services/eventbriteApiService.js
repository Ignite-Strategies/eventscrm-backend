/**
 * 🎟️ Eventbrite API Service
 * Handles all Eventbrite API interactions
 * Docs: https://www.eventbrite.com/platform/api
 */

import axios from 'axios';

const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3';

/**
 * Create axios instance with Eventbrite auth
 */
function createEventbriteClient(accessToken) {
  return axios.create({
    baseURL: EVENTBRITE_API_BASE,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Get authenticated user info
 * GET /users/me/
 */
export async function getEventbriteUser(accessToken) {
  try {
    const client = createEventbriteClient(accessToken);
    const response = await client.get('/users/me/');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error fetching Eventbrite user:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
}

/**
 * Get user's organizations
 * GET /users/me/organizations/
 */
export async function getEventbriteOrganizations(accessToken) {
  try {
    const client = createEventbriteClient(accessToken);
    const response = await client.get('/users/me/organizations/');
    return {
      success: true,
      data: response.data.organizations || []
    };
  } catch (error) {
    console.error('❌ Error fetching Eventbrite organizations:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
}

/**
 * Get user's events
 * GET /users/me/events/
 * @param {string} accessToken - Eventbrite access token
 * @param {object} options - Query options
 * @param {string} options.status - Event status: 'live', 'draft', 'canceled', 'all'
 * @param {string} options.orderBy - Order by: 'start_asc', 'start_desc', 'created_asc', 'created_desc'
 */
export async function getEventbriteEvents(accessToken, options = {}) {
  try {
    const client = createEventbriteClient(accessToken);
    
    const params = {
      status: options.status || 'live',
      order_by: options.orderBy || 'start_desc',
      expand: 'ticket_classes,venue'
    };
    
    const response = await client.get('/users/me/events/', { params });
    
    return {
      success: true,
      data: response.data.events || [],
      pagination: response.data.pagination
    };
  } catch (error) {
    console.error('❌ Error fetching Eventbrite events:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
}

/**
 * Get single event details
 * GET /events/:event_id/
 * @param {string} accessToken - Eventbrite access token
 * @param {string} eventId - Eventbrite event ID
 */
export async function getEventbriteEvent(accessToken, eventId) {
  try {
    const client = createEventbriteClient(accessToken);
    
    const response = await client.get(`/events/${eventId}/`, {
      params: {
        expand: 'ticket_classes,venue,organizer,format,category,subcategory'
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`❌ Error fetching Eventbrite event ${eventId}:`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
}

/**
 * Get event attendees
 * GET /events/:event_id/attendees/
 * @param {string} accessToken - Eventbrite access token
 * @param {string} eventId - Eventbrite event ID
 * @param {object} options - Query options
 * @param {string} options.status - Attendee status: 'attending', 'not_attending', 'all'
 */
export async function getEventbriteAttendees(accessToken, eventId, options = {}) {
  try {
    const client = createEventbriteClient(accessToken);
    
    let allAttendees = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const params = {
        status: options.status || 'attending',
        page: page
      };
      
      const response = await client.get(`/events/${eventId}/attendees/`, { params });
      
      const attendees = response.data.attendees || [];
      allAttendees = [...allAttendees, ...attendees];
      
      // Check pagination
      const pagination = response.data.pagination;
      if (pagination.has_more_items) {
        page++;
      } else {
        hasMorePages = false;
      }
    }
    
    return {
      success: true,
      data: allAttendees,
      count: allAttendees.length
    };
  } catch (error) {
    console.error(`❌ Error fetching attendees for event ${eventId}:`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
}

/**
 * Get event orders (more detailed than attendees)
 * GET /events/:event_id/orders/
 * @param {string} accessToken - Eventbrite access token
 * @param {string} eventId - Eventbrite event ID
 */
export async function getEventbriteOrders(accessToken, eventId) {
  try {
    const client = createEventbriteClient(accessToken);
    
    let allOrders = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const params = {
        status: 'active', // active orders only (not refunded/canceled)
        page: page
      };
      
      const response = await client.get(`/events/${eventId}/orders/`, { params });
      
      const orders = response.data.orders || [];
      allOrders = [...allOrders, ...orders];
      
      // Check pagination
      const pagination = response.data.pagination;
      if (pagination.has_more_items) {
        page++;
      } else {
        hasMorePages = false;
      }
    }
    
    return {
      success: true,
      data: allOrders,
      count: allOrders.length
    };
  } catch (error) {
    console.error(`❌ Error fetching orders for event ${eventId}:`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message
    };
  }
}

/**
 * Map Eventbrite attendee to Contact data structure
 * @param {object} attendee - Eventbrite attendee object
 * @param {object} context - Context data (orgId, eventId, containerId)
 */
export function mapEventbriteAttendeeToContact(attendee, context) {
  const { orgId, eventId, containerId } = context;
  
  // Extract profile data
  const profile = attendee.profile || {};
  const costs = attendee.costs || {};
  
  // Determine stage based on payment
  const isPaid = costs.gross?.value > 0;
  const currentStage = isPaid ? 'paid' : 'rsvped';
  
  return {
    // Required field
    email: profile.email,
    
    // Personhood
    firstName: profile.first_name || profile.name?.split(' ')[0],
    lastName: profile.last_name || profile.name?.split(' ').slice(1).join(' '),
    phone: profile.cell_phone || profile.work_phone || profile.home_phone,
    
    // Address
    street: profile.addresses?.[0]?.address_1,
    city: profile.addresses?.[0]?.city,
    state: profile.addresses?.[0]?.region,
    zip: profile.addresses?.[0]?.postal_code,
    
    // Context (tenant isolation)
    orgId: orgId,
    eventId: eventId,
    containerId: containerId,
    
    // Event-specific
    currentStage: currentStage,
    audienceType: 'landing_page_public', // Assume public landing page
    ticketType: attendee.ticket_class_name,
    amountPaid: costs.gross?.value ? costs.gross.value / 100 : 0, // Convert cents to dollars
    
    // Eventbrite tracking (for deduplication)
    eventbriteAttendeeId: attendee.id,
    eventbriteOrderId: attendee.order_id
  };
}

/**
 * Get connection from database and validate
 * @param {object} prisma - Prisma client
 * @param {string} orgId - Organization ID
 * @param {string} containerId - Container ID
 */
export async function getEventbriteConnection(prisma, orgId, containerId) {
  try {
    const connection = await prisma.eventbriteOAuthConnection.findFirst({
      where: {
        orgId: orgId,
        containerId: containerId,
        status: 'active'
      }
    });
    
    if (!connection) {
      return {
        success: false,
        error: 'No active Eventbrite connection found. Please connect your Eventbrite account first.'
      };
    }
    
    return {
      success: true,
      data: connection
    };
  } catch (error) {
    console.error('❌ Error fetching Eventbrite connection:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

