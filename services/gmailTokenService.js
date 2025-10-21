import { getPrismaClient } from '../config/database.js';
import { google } from 'googleapis';

const prisma = getPrismaClient();

/**
 * Gmail Token Service
 * Manages Gmail OAuth tokens with automatic refresh
 * 
 * Pattern copied from YouTube - stores refresh tokens in DB,
 * automatically refreshes access tokens when expired
 */
class GmailTokenService {
  
  /**
   * Get a valid Gmail access token for sending emails
   * Automatically refreshes if expired
   * 
   * @param {string} orgId - Organization ID
   * @param {string} adminId - Admin ID
   * @returns {Promise<string>} Valid access token
   * @throws {Error} If no Gmail connection found or refresh fails
   */
  static async getValidToken(orgId, adminId) {
    console.log('🔑 GmailTokenService: Getting valid token for', { orgId, adminId });
    
    // Find Gmail connection for this org/admin
    const connection = await prisma.gmailConnection.findFirst({
      where: {
        orgId,
        adminId,
        status: 'active'
      }
    });
    
    if (!connection) {
      throw new Error('Gmail not connected. Please connect Gmail first.');
    }
    
    console.log('✅ Found Gmail connection:', {
      id: connection.id,
      email: connection.email,
      hasRefreshToken: !!connection.refreshToken,
      tokenExpiry: connection.tokenExpiry
    });
    
    // Check if access token is still valid (with 5-minute buffer)
    const now = new Date();
    const expiryWithBuffer = new Date(connection.tokenExpiry);
    expiryWithBuffer.setMinutes(expiryWithBuffer.getMinutes() - 5);
    
    if (connection.accessToken && now < expiryWithBuffer) {
      console.log('✅ Access token still valid, using cached token');
      return connection.accessToken;
    }
    
    console.log('🔄 Access token expired or missing, refreshing...');
    
    // Token expired or missing - refresh it
    const newAccessToken = await this.refreshAccessToken(connection.id, connection.refreshToken);
    
    console.log('✅ Token refreshed successfully');
    return newAccessToken;
  }
  
  /**
   * Refresh an access token using the refresh token
   * 
   * @param {string} connectionId - GmailConnection ID
   * @param {string} refreshToken - Persistent refresh token
   * @returns {Promise<string>} New access token
   */
  static async refreshAccessToken(connectionId, refreshToken) {
    console.log('🔄 Refreshing access token for connection:', connectionId);
    
    if (!refreshToken) {
      throw new Error('No refresh token available. Please reconnect Gmail.');
    }
    
    try {
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "https://app.engage-smart.com/oauth/callback" // Hardcoded redirect (not secret)
      );
      
      // Set refresh token
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });
      
      // Get new access token
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      console.log('✅ New access token received:', {
        hasAccessToken: !!credentials.access_token,
        expiresIn: credentials.expiry_date ? new Date(credentials.expiry_date) : 'unknown'
      });
      
      // Update database with new access token
      await prisma.gmailConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: credentials.access_token,
          tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          updatedAt: new Date()
        }
      });
      
      console.log('💾 Updated access token in database');
      
      return credentials.access_token;
      
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      
      // Mark connection as disconnected if refresh fails
      await prisma.gmailConnection.update({
        where: { id: connectionId },
        data: {
          status: 'revoked',
          updatedAt: new Date()
        }
      });
      
      throw new Error('Failed to refresh Gmail token. Please reconnect Gmail.');
    }
  }
  
  /**
   * Check if Gmail is connected for this org/admin
   * 
   * @param {string} orgId - Organization ID
   * @param {string} adminId - Admin ID
   * @returns {Promise<boolean>} True if connected and active
   */
  static async isConnected(orgId, adminId) {
    const connection = await prisma.gmailConnection.findFirst({
      where: {
        orgId,
        adminId,
        status: 'active'
      }
    });
    
    return !!connection;
  }
  
  /**
   * Get connection details (without tokens)
   * 
   * @param {string} orgId - Organization ID
   * @param {string} adminId - Admin ID
   * @returns {Promise<object|null>} Connection details or null
   */
  static async getConnectionInfo(orgId, adminId) {
    const connection = await prisma.gmailConnection.findFirst({
      where: {
        orgId,
        adminId,
        status: 'active'
      },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return connection;
  }
}

export default GmailTokenService;

