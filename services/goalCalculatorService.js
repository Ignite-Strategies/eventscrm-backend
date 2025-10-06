/**
 * Goal Calculator Service
 * Calculates tickets needed and invites required based on event goals
 */

/**
 * Calculate how many tickets need to be sold to reach fundraising goal
 * @param {number} fundraisingGoal - Total fundraising goal
 * @param {number} additionalExpenses - Additional expenses to cover
 * @param {number} ticketCost - Price per ticket
 * @returns {number} Number of tickets needed
 */
export function calculateTicketsNeeded(fundraisingGoal, additionalExpenses, ticketCost) {
  if (ticketCost === 0) {
    return 0;
  }
  
  const totalNeeded = fundraisingGoal + additionalExpenses;
  return Math.ceil(totalNeeded / ticketCost);
}

/**
 * Calculate how many invites need to be sent based on conversion rate
 * @param {number} ticketsNeeded - Number of tickets that need to be sold
 * @param {number} conversionRate - Expected conversion rate (0.0 to 1.0, e.g., 0.25 = 25%)
 * @returns {number} Number of invites needed
 */
export function calculateInvitesNeeded(ticketsNeeded, conversionRate = 0.25) {
  if (conversionRate === 0) {
    return 0;
  }
  
  return Math.ceil(ticketsNeeded / conversionRate);
}

/**
 * Calculate full event goals breakdown
 * @param {Object} params - Event parameters
 * @param {number} params.fundraisingGoal - Total fundraising goal
 * @param {number} params.additionalExpenses - Additional expenses
 * @param {number} params.ticketCost - Price per ticket
 * @param {number} params.conversionRate - Expected conversion rate (default: 0.25)
 * @returns {Object} Goal breakdown with tickets and invites needed
 */
export function calculateEventGoals({
  fundraisingGoal,
  additionalExpenses,
  ticketCost,
  conversionRate = 0.25
}) {
  const ticketsNeeded = calculateTicketsNeeded(fundraisingGoal, additionalExpenses, ticketCost);
  const invitesNeeded = calculateInvitesNeeded(ticketsNeeded, conversionRate);
  const totalNeeded = fundraisingGoal + additionalExpenses;
  const netFundraise = fundraisingGoal;
  
  return {
    totalNeeded,
    netFundraise,
    expenses: additionalExpenses,
    ticketsNeeded,
    invitesNeeded,
    ticketCost,
    conversionRate,
    conversionRatePercent: Math.round(conversionRate * 100)
  };
}

/**
 * Calculate progress toward goal
 * @param {Object} params
 * @param {number} params.ticketsSold - Current tickets sold
 * @param {number} params.ticketsNeeded - Target tickets needed
 * @param {number} params.invitesSent - Current invites sent
 * @param {number} params.invitesNeeded - Target invites needed
 * @returns {Object} Progress breakdown
 */
export function calculateGoalProgress({
  ticketsSold = 0,
  ticketsNeeded,
  invitesSent = 0,
  invitesNeeded
}) {
  const ticketProgress = ticketsNeeded > 0 ? (ticketsSold / ticketsNeeded) * 100 : 0;
  const inviteProgress = invitesNeeded > 0 ? (invitesSent / invitesNeeded) * 100 : 0;
  const actualConversionRate = invitesSent > 0 ? ticketsSold / invitesSent : 0;
  
  return {
    ticketsSold,
    ticketsNeeded,
    ticketsRemaining: Math.max(0, ticketsNeeded - ticketsSold),
    ticketProgress: Math.min(100, Math.round(ticketProgress)),
    invitesSent,
    invitesNeeded,
    invitesRemaining: Math.max(0, invitesNeeded - invitesSent),
    inviteProgress: Math.min(100, Math.round(inviteProgress)),
    actualConversionRate: Math.round(actualConversionRate * 100),
    onTrack: ticketProgress >= inviteProgress
  };
}

