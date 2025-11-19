// Background service worker for the Chrome extension
interface CaptureMessage {
  type: 'CAPTURE_SCREENSHOT';
  backendUrl?: string;
  provider?: string;
}

interface ResponseMessage {
  type: 'SCREENSHOT_RESULT';
  success: boolean;
  answer?: string;
  error?: string;
}

// Hardcoded settings
const HARDCODED_SETTINGS = {
  backendUrl: 'http://localhost:3002/analyze',
  jpegQuality: 95,
  provider: 'gemini'
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message: CaptureMessage, sender, sendResponse) => {
  if (message.type === 'CAPTURE_SCREENSHOT') {
    // Validate sender and tab
    if (!sender.tab?.id) {
      sendResponse({
        type: 'SCREENSHOT_RESULT',
        success: false,
        error: 'Invalid tab context'
      } as ResponseMessage);
      return;
    }

    handleScreenshotCapture(sender.tab.id)
      .then((response) => {
        // Check if we can still send response (context might be invalidated)
        try {
          sendResponse(response);
        } catch (error) {
          console.error('Failed to send response (context may be invalidated):', error);
        }
      })
      .catch((error) => {
        console.error('Error handling screenshot:', error);
        try {
          sendResponse({
            type: 'SCREENSHOT_RESULT',
            success: false,
            error: error.message || 'Unknown error occurred'
          } as ResponseMessage);
        } catch (responseError) {
          console.error('Failed to send error response:', responseError);
        }
      });
    
    // Return true to indicate we'll send response asynchronously
    return true;
  }
});

async function handleScreenshotCapture(tabId?: number): Promise<ResponseMessage> {
  if (!tabId) {
    throw new Error('No active tab found');
  }

  try {
    // First ensure we have the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    
    if (!activeTab || !activeTab.id) {
      throw new Error('No active tab found');
    }

    // Use chrome.tabs.captureVisibleTab with the current window
    const dataUrl = await new Promise<string>((resolve, reject) => {
      chrome.tabs.captureVisibleTab(activeTab.windowId, {
        format: 'png'  // PNG format for better text clarity
      }, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!result) {
          reject(new Error('Screenshot capture returned empty result'));
        } else {
          resolve(result);
        }
      });
    });

    // Convert data URL to base64 string (remove data:image/png;base64, prefix)
    const base64Image = dataUrl.split(',')[1];

    // Send to backend with hardcoded settings
    const requestBody = {
      image: base64Image,
      format: 'png',
      provider: HARDCODED_SETTINGS.provider
    };

    const response = await fetch(HARDCODED_SETTINGS.backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.answer) {
      throw new Error('Invalid response format: missing answer field');
    }

    return {
      type: 'SCREENSHOT_RESULT',
      success: true,
      answer: result.answer
    };

  } catch (error) {
    console.error('Screenshot capture error:', error);
    throw error;
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('AI Extension installed - no setup required');
  }
});

export {};
