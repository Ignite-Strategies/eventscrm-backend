// Event Configuration
// Real event IDs from the database

export const EVENT_CONFIG = {
  // Bros & Brews Event
  BROS_AND_BREWS: {
    id: 'cmggljv7z0002nt28gckp1jpe',
    name: 'Bros & Brews',
    slug: 'bros-&-brews'
  }
};

// Helper function to get event by ID
export const getEventById = (eventId) => {
  return Object.values(EVENT_CONFIG).find(event => event.id === eventId);
};

// Helper function to get all events
export const getAllEvents = () => {
  return Object.values(EVENT_CONFIG);
};

export default EVENT_CONFIG;
