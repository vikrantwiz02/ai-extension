// Background service worker for the Chrome extension
interface CaptureMessage {
  type: 'CAPTURE_SCREENSHOT';
}

interface ResponseMessage {
  type: 'SCREENSHOT_RESULT';
  success: boolean;
  answer?: string;
  error?: string;
}

interface ExtensionSettings {
  apiKey: string;
  backendUrl: string;
  jpegQuality: number;
  provider: string;
  model: string;
  ollamaBaseUrl: string;
}

// Default settings
const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  backendUrl: 'https://ai-extension-ny8n.onrender.com/analyze',
  jpegQuality: 80,
  provider: 'groq',
  model: 'llava-v1.5-7b-4096-preview',
  ollamaBaseUrl: 'http://localhost:11434'
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
    // Get user settings
    const settings = await getSettings();
    
    if (!settings.backendUrl) {
      throw new Error('Please configure backend URL in extension options');
    }

    // Check if API key is required for the selected provider
    const providersRequiringApiKey = ['deepseek', 'groq', 'huggingface', 'replicate', 'perplexity', 'mistral', 'gemini', 'openai', 'claude'];
    if (providersRequiringApiKey.includes(settings.provider) && !settings.apiKey) {
      throw new Error(`Please configure API key for ${settings.provider} in extension options`);
    }

    // First ensure we have the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    
    if (!activeTab || !activeTab.id) {
      throw new Error('No active tab found');
    }

    // Use chrome.tabs.captureVisibleTab with the current window
    const dataUrl = await new Promise<string>((resolve, reject) => {
      chrome.tabs.captureVisibleTab(activeTab.windowId, {
        format: 'jpeg',
        quality: settings.jpegQuality
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

    // Convert data URL to base64 string (remove data:image/jpeg;base64, prefix)
    const base64Image = dataUrl.split(',')[1];

    // Send to backend
    const requestBody: any = {
      image: base64Image,
      format: 'jpeg',
      provider: settings.provider,
      model: settings.model
    };

    // Add Ollama-specific settings
    if (settings.provider === 'ollama') {
      requestBody.baseUrl = settings.ollamaBaseUrl;
    }

    const headers: any = {
      'Content-Type': 'application/json'
    };

    // Only add Authorization header if API key is needed
    if (settings.apiKey) {
      headers['Authorization'] = `Bearer ${settings.apiKey}`;
    }

    const response = await fetch(settings.backendUrl, {
      method: 'POST',
      headers,
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

async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      resolve(items as ExtensionSettings);
    });
  });
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.sync.set(DEFAULT_SETTINGS);
    
    // Open options page on install
    chrome.runtime.openOptionsPage();
  }
});

export {};
