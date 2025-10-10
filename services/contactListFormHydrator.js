import { getPrismaClient } from "../config/database.js";

const prisma = getPrismaClient();

/**
 * Hydrate contact list creation form with actual data from database
 * This ensures the form always matches the schema (no hardcoded values)
 */
class ContactListFormHydrator {
  
  /**
   * Get all data needed to populate the contact list creation form
   */
  static async getFormData(orgId) {
    if (!orgId) {
      throw new Error("orgId is required");
    }

    // Fetch all dynamic data in parallel
    const [
      events,
      organization,
      contactCount,
      orgMemberCount
    ] = await Promise.all([
      // Get all events for this org
      prisma.event.findMany({
        where: { orgId },
        select: {
          id: true,
          name: true,
          startDateTime: true,
          status: true
        },
        orderBy: {
          startDateTime: 'desc'
        }
      }),
      
      // Get organization for audience types and pipeline stages
      prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          audienceDefaults: true,
          pipelineDefaults: true
        }
      }),
      
      // Get contact count
      prisma.contact.count({
        where: { orgId }
      }),
      
      // Get org member count
      prisma.orgMember.count({
        where: { orgId }
      })
    ]);

    return {
      // List types available
      listTypes: [
        {
          value: "contact",
          label: "General Contact",
          description: "All contacts in your CRM",
          count: contactCount
        },
        {
          value: "org_member",
          label: "Org Member (Master List)",
          description: "Promoted contacts in your master list",
          count: orgMemberCount
        },
        {
          value: "event_attendee",
          label: "Event Attendee",
          description: "Contacts from a specific event pipeline",
          count: events.length > 0 ? "Select event" : 0
        }
      ],
      
      // Events for event_attendee type
      events: events.map(event => ({
        id: event.id,
        name: event.name,
        date: event.startDateTime,
        status: event.status
      })),
      
      // Audience types (from org defaults)
      audienceTypes: organization?.audienceDefaults || [],
      
      // Pipeline stages (from org defaults)
      pipelineStages: organization?.pipelineDefaults || []
    };
  }

  /**
   * Validate contact list creation data against schema
   */
  static validateListData(data) {
    const { type, name, orgId } = data;
    
    if (!type || !name || !orgId) {
      throw new Error("type, name, and orgId are required");
    }
    
    const validTypes = ["contact", "org_member", "event_attendee"];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(", ")}`);
    }
    
    // Type-specific validation
    if (type === "event_attendee" && !data.criteria?.eventId) {
      throw new Error("eventId is required for event_attendee lists");
    }
    
    return true;
  }
}

export default ContactListFormHydrator;

