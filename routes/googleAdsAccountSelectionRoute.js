import express from 'express';
import { google } from 'googleapis';
import { getPrismaClient } from '../config/database.js';
import { createId } from '@paralleldrive/cuid2';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /api/google-ads-account-selection/list
 * 
 * Fetches accessible Google Ads accounts using the refresh token
 * Returns list of accounts for user to choose from
 */
router.get('/list', async (req, res) => {
  try {
    const { connectionId } = req.query;
    
    if (!connectionId) {
      return res.status(400).json({ error: 'connectionId is required' });
    }
    
    console.log('📊 Fetching Google Ads accounts for connection:', connectionId);
    
    // Get the OAuth connection
    const connection = await prisma.googleOAuthConnection.findUnique({
      where: { id: connectionId }
    });
    
    if (!connection || connection.service !== 'ads') {
      return res.status(404).json({ error: 'Google Ads connection not found' });
    }
    
    // Set up OAuth2 client with refresh token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://app.engage-smart.com/oauth/callback"
    );
    
    oauth2Client.setCredentials({
      refresh_token: connection.refreshToken,
      access_token: connection.accessToken
    });
    
    // Refresh the access token if needed
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    
    // Update access token in database if refreshed
    if (credentials.access_token !== connection.accessToken) {
      await prisma.googleOAuthConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: credentials.access_token,
          expiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
        }
      });
      console.log('✅ Access token refreshed');
    }
    
    // Call Google Ads API to list accessible customers
    // Note: This uses the Google Ads REST API
    const response = await fetch('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '0sxeRFk29XaMRNU3sVbVLA',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Ads API error:', errorText);
      throw new Error(`Google Ads API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Accessible customers:', data);
    
    // The API returns customer IDs in format "customers/123456789"
    // We need to fetch details for each customer
    const customerIds = data.resourceNames || [];
    const accounts = [];
    
    for (const resourceName of customerIds) {
      const customerId = resourceName.split('/')[1]; // Extract ID from "customers/123456789"
      
      // Fetch customer details
      const detailsResponse = await fetch(
        `https://googleads.googleapis.com/v17/${resourceName}?fields=customer.id,customer.descriptive_name,customer.currency_code,customer.time_zone`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${credentials.access_token}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '0sxeRFk29XaMRNU3sVbVLA',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (detailsResponse.ok) {
        const customerData = await detailsResponse.json();
        accounts.push({
          customerId: customerId,
          accountName: customerData.customer?.descriptiveName || `Account ${customerId}`,
          currency: customerData.customer?.currencyCode || 'USD',
          timezone: customerData.customer?.timeZone || 'UTC'
        });
      } else {
        // If we can't fetch details, just add the ID
        accounts.push({
          customerId: customerId,
          accountName: `Account ${customerId}`,
          currency: 'USD',
          timezone: 'UTC'
        });
      }
    }
    
    console.log(`✅ Found ${accounts.length} Google Ads accounts`);
    res.json({ accounts });
    
  } catch (error) {
    console.error('❌ Error fetching Google Ads accounts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Google Ads accounts',
      details: error.message 
    });
  }
});

/**
 * POST /api/google-ads-account-selection/select
 * 
 * Saves the user's selected Google Ads account
 * Creates a GoogleAdAccount record linked to the GoogleOAuthConnection
 */
router.post('/select', async (req, res) => {
  try {
    const { connectionId, customerId, accountName, currency, timezone } = req.body;
    
    if (!connectionId || !customerId) {
      return res.status(400).json({ error: 'connectionId and customerId are required' });
    }
    
    console.log('💾 Saving Google Ads account selection:', { connectionId, customerId });
    
    // Get the OAuth connection to get orgId
    const connection = await prisma.googleOAuthConnection.findUnique({
      where: { id: connectionId }
    });
    
    if (!connection) {
      return res.status(404).json({ error: 'OAuth connection not found' });
    }
    
    // Check if this account already exists
    const existing = await prisma.googleAdAccount.findUnique({
      where: { customerId: customerId }
    });
    
    if (existing) {
      console.log('✅ Google Ads account already exists:', existing.id);
      return res.json({ 
        success: true, 
        accountId: existing.id,
        message: 'Account already connected'
      });
    }
    
    // Create new GoogleAdAccount record
    const googleAdAccount = await prisma.googleAdAccount.create({
      data: {
        id: createId(),
        googleOAuthConnectionId: connectionId,
        orgId: connection.orgId,
        customerId: customerId,
        accountName: accountName || `Account ${customerId}`,
        currency: currency || 'USD',
        timezone: timezone || 'UTC',
        developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '0sxeRFk29XaMRNU3sVbVLA',
        status: 'active'
      }
    });
    
    console.log('✅ Google Ads account created:', googleAdAccount.id);
    
    res.json({ 
      success: true, 
      accountId: googleAdAccount.id,
      message: 'Google Ads account connected successfully'
    });
    
  } catch (error) {
    console.error('❌ Error saving Google Ads account:', error);
    res.status(500).json({ 
      error: 'Failed to save Google Ads account',
      details: error.message 
    });
  }
});

export default router;

