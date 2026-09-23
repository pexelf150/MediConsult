import crypto from 'crypto';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

// OAuth 2.0 token cache
let oauthToken = null;
let tokenExpiry = null;

// Get OAuth 2.0 access token
const getOAuthToken = async () => {
  // Return cached token if still valid
  if (oauthToken && tokenExpiry && Date.now() < tokenExpiry) {
    return oauthToken;
  }

  if (!env.zoom.oauthClientId || !env.zoom.oauthClientSecret || !env.zoom.oauthAccountId) {
    throw new ApiError(500, 'Zoom OAuth credentials not configured');
  }

  try {
    const credentials = Buffer.from(`${env.zoom.oauthClientId}:${env.zoom.oauthClientSecret}`).toString('base64');

    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=account_credentials&account_id=' + env.zoom.oauthAccountId,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Zoom OAuth error:', errorData);
      throw new ApiError(500, `Failed to get Zoom OAuth token: ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    oauthToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Expire 1 minute early

    return oauthToken;
  } catch (error) {
    console.error('Error getting Zoom OAuth token:', error);
    throw new ApiError(500, `Failed to get Zoom OAuth token: ${error.message}`);
  }
};

// Create a Zoom meeting
export const createZoomMeeting = async (appointmentData) => {
  const { appointmentId, doctor, patient, scheduledAt } = appointmentData;

  try {
    const accessToken = await getOAuthToken();
    
    const meetingTopic = `Premedi Lanka Consultation - ${appointmentId}`;
    const startTime = new Date(scheduledAt).toISOString();
    
    const requestBody = {
      topic: meetingTopic,
      type: env.zoom.meetingType || 2, // 2 = Scheduled meeting
      start_time: startTime,
      duration: 60, // 1 hour default
      timezone: 'Asia/Colombo',
      agenda: 'Medical consultation with Premedi Lanka',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 2, // No approval required
        audio: 'both',
        auto_recording: 'none',
        waiting_room: false,
        embed_in_website: true,
      },
    };

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Zoom API error:', errorData);
      throw new ApiError(500, `Failed to create Zoom meeting: ${errorData.message || 'Unknown error'}`);
    }

    const meetingData = await response.json();

    return {
      meetingId: meetingData.id,
      meetingUrl: meetingData.join_url,
      meetingPassword: meetingData.password,
      startUrl: meetingData.start_url,
      joinUrl: meetingData.join_url,
      startTime: meetingData.start_time,
      duration: meetingData.duration,
      topic: meetingData.topic,
    };
  } catch (error) {
    console.error('Error creating Zoom meeting:', error);
    throw new ApiError(500, `Failed to create Zoom meeting: ${error.message}`);
  }
};

// Get meeting join URL based on user role
export const getMeetingJoinUrl = (appointment, userRole) => {
  if (!appointment.zoom?.meetingUrl) {
    throw new ApiError(404, 'Meeting not yet created for this appointment');
  }

  // For doctors, use start_url; for patients, use join_url
  if (userRole === 'doctor' && appointment.zoom.startUrl) {
    return appointment.zoom.startUrl;
  }

  return appointment.zoom.meetingUrl;
};

// Delete a Zoom meeting
export const deleteZoomMeeting = async (meetingId) => {
  try {
    const accessToken = await getOAuthToken();

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json();
      console.error('Zoom API error:', errorData);
      throw new ApiError(500, `Failed to delete Zoom meeting: ${errorData.message || 'Unknown error'}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting Zoom meeting:', error);
    throw new ApiError(500, `Failed to delete Zoom meeting: ${error.message}`);
  }
};

// Update meeting time
export const updateZoomMeeting = async (meetingId, newStartTime) => {
  try {
    const accessToken = await getOAuthToken();

    const requestBody = {
      start_time: new Date(newStartTime).toISOString(),
      timezone: 'Asia/Colombo',
    };

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Zoom API error:', errorData);
      throw new ApiError(500, `Failed to update Zoom meeting: ${errorData.message || 'Unknown error'}`);
    }

    const meetingData = await response.json();
    return meetingData;
  } catch (error) {
    console.error('Error updating Zoom meeting:', error);
    throw new ApiError(500, `Failed to update Zoom meeting: ${error.message}`);
  }
};

export default {
  createZoomMeeting,
  getMeetingJoinUrl,
  deleteZoomMeeting,
  updateZoomMeeting,
};
