import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import env from '../config/env.js';
import KJUR from 'jsrsasign';

// Generate Zoom Meeting SDK signature
export const generateSDKSignature = asyncHandler(async (req, res) => {
  const { meetingNumber, role = 0 } = req.body;

  if (!meetingNumber) {
    return res.status(400).json(new ApiResponse(400, 'Meeting number is required'));
  }

  try {
    console.log('Generating signature for meeting:', meetingNumber);
    console.log('Using SDK Key:', env.zoom.sdkKey);
    console.log('SDK Secret exists:', !!env.zoom.sdkSecret);

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 2; // Token expires in 2 hours

    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const payload = {
      appKey: env.zoom.sdkKey, // SDK Key (Client ID from Meeting SDK app)
      mn: parseInt(meetingNumber), // Ensure meeting number is a number
      role: role, // 0 for participant, 1 for host
      iat,
      exp,
      tokenExp: exp,
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Use jsrsasign library as recommended by Zoom
    const sHeader = JSON.stringify(header);
    const sPayload = JSON.stringify(payload);
    const signature = KJUR.jws.JWS.sign(
      'HS256',
      sHeader,
      sPayload,
      env.zoom.sdkSecret
    );

    console.log('Generated signature:', signature);

    res.status(200).json(new ApiResponse(200, 'SDK signature generated successfully', {
      signature: signature,
      sdkKey: env.zoom.sdkKey
    }));
  } catch (error) {
    console.error('Error generating SDK signature:', error);
    return res.status(500).json(new ApiResponse(500, 'Failed to generate SDK signature'));
  }
});

export default {
  generateSDKSignature,
};
