import axios from 'axios';

/**
 * Create checkout session via pay-backend
 */
export async function createCheckout(membership, event, contact) {
  try {
    const response = await axios.post(
      `${process.env.PAY_BACKEND_URL}/create-checkout`,
      {
        membershipId: membership._id.toString(),
        eventId: event._id.toString(),
        amount: event.goals.ticketPrice,
        eventName: event.name,
        customerEmail: contact.email,
        customerName: contact.name
      }
    );
    
    return response.data.url;
  } catch (error) {
    console.error('Error creating checkout:', error);
    throw new Error('Failed to create checkout session');
  }
}

