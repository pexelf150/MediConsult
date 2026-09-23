import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '@/lib/api-config';

interface ZoomMeetingProps {
  meetingNumber: string;
  userName: string;
  userEmail: string;
  password?: string;
  onLeave?: () => void;
}

declare global {
  interface Window {
    ZoomMtgEmbedded: any;
  }
}

let client: any = null;

export default function ZoomMeeting({
  meetingNumber,
  userName,
  userEmail,
  password,
  onLeave,
}: ZoomMeetingProps) {
  const [isMeetingJoined, setIsMeetingJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Zoom SDK dependencies from CDN
    const loadZoomSDK = async () => {
      if (window.ZoomMtgEmbedded) {
        setIsLoaded(true);
        return;
      }

      try {
        // Load React dependencies first
        const loadScript = (src: string): Promise<void> => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.body.appendChild(script);
          });
        };

        await loadScript('https://source.zoom.us/3.13.0/lib/vendor/react.min.js');
        await loadScript('https://source.zoom.us/3.13.0/lib/vendor/react-dom.min.js');
        await loadScript('https://source.zoom.us/3.13.0/lib/vendor/redux.min.js');
        await loadScript('https://source.zoom.us/3.13.0/lib/vendor/redux-thunk.min.js');
        await loadScript('https://source.zoom.us/3.13.0/lib/vendor/lodash.min.js');
        
        // Load Zoom SDK
        await loadScript('https://source.zoom.us/3.13.0/zoom-meeting-embedded-3.13.0.min.js');
        
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load Zoom SDK:', err);
        setError('Failed to load Zoom SDK');
      }
    };

    loadZoomSDK();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const initZoom = async () => {
      try {
        const { signature, sdkKey } = await getSignature(meetingNumber);
        
        console.log('Signature response:', { signature, sdkKey });

        // Create container dynamically in body
        const container = document.createElement('div');
        container.id = 'zoom-meeting-container';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        document.body.appendChild(container);

        // Create Zoom Meeting SDK client
        client = window.ZoomMtgEmbedded.createClient();

        await client.init({
          zoomAppRoot: container,
          language: 'en-US',
          patchJsMedia: true,
        });

        await client.join({
          sdkKey: sdkKey,
          signature: signature,
          meetingNumber: parseInt(meetingNumber),
          password: password,
          userName: userName,
          userEmail: userEmail,
        });

        setIsMeetingJoined(true);
        setError(null);
      } catch (err) {
        console.error('Zoom error:', err);
        setError('Failed to join meeting. Please try again.');
      }
    };

    initZoom();

    return () => {
      if (client) {
        client.leaveMeeting();
        client = null;
      }
      // Clean up container
      const container = document.getElementById('zoom-meeting-container');
      if (container) {
        container.remove();
      }
    };
  }, [isLoaded, meetingNumber, userName, userEmail, password]);

  const handleLeave = () => {
    if (client) {
      client.leaveMeeting();
      client = null;
    }
    if (onLeave) onLeave();
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Zoom SDK...</p>
        </div>
      </div>
    );
  }

  if (!isMeetingJoined) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to Zoom meeting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {onLeave && (
        <button
          onClick={handleLeave}
          className="absolute top-4 right-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 z-50"
        >
          Leave Meeting
        </button>
      )}
    </div>
  );
}

async function getSignature(meetingNumber: string): Promise<{ signature: string; sdkKey: string }> {
  try {
    const response = await fetch(apiUrl('/zoom/signature'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ meetingNumber }),
    });

    if (!response.ok) {
      throw new Error('Failed to get signature');
    }

    const result = await response.json();
    console.log('Full API response:', result);
    
    // Handle ApiResponse wrapper
    const data = result.data || result;
    console.log('Extracted data:', data);
    
    return { signature: data.signature, sdkKey: data.sdkKey };
  } catch (error) {
    console.error('Error getting signature:', error);
    throw error;
  }
}
