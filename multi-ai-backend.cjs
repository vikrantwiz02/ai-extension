const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Statistics tracking
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  startTime: new Date(),
  providers: {
    deepseek: { requests: 0, successes: 0, failures: 0 },
    groq: { requests: 0, successes: 0, failures: 0 },
    huggingface: { requests: 0, successes: 0, failures: 0 },
    replicate: { requests: 0, successes: 0, failures: 0 },
    perplexity: { requests: 0, successes: 0, failures: 0 },
  mistral: { requests: 0, successes: 0, failures: 0 },
    gemini: { requests: 0, successes: 0, failures: 0 },
    openai: { requests: 0, successes: 0, failures: 0 },
    claude: { requests: 0, successes: 0, failures: 0 },
    ollama: { requests: 0, successes: 0, failures: 0 }
  }
};

// Gemini API Key Rotation System
class GeminiKeyRotator {
  constructor() {
    this.keys = [];
    this.currentIndex = 0;
    this.keyStatus = new Map(); // Track which keys are working
  }

  // Add multiple API keys (comma-separated or array)
  setKeys(keysInput) {
    if (typeof keysInput === 'string') {
      this.keys = keysInput.split(',').map(key => key.trim()).filter(key => key);
    } else if (Array.isArray(keysInput)) {
      this.keys = keysInput.filter(key => key);
    }
    
    console.log(`🔑 Loaded ${this.keys.length} Gemini API keys for rotation`);
    
    // Initialize all keys as working
    this.keys.forEach(key => {
      this.keyStatus.set(key, { working: true, lastFailed: null, requests: 0 });
    });
  }

  // Get next working API key
  getNextKey() {
    if (this.keys.length === 0) {
      throw new Error('No Gemini API keys configured');
    }

    if (this.keys.length === 1) {
      return this.keys[0];
    }

    // Find next working key
    let attempts = 0;
    while (attempts < this.keys.length) {
      const key = this.keys[this.currentIndex];
      const status = this.keyStatus.get(key);
      
      // If key is working or it's been 1 hour since last failure, try it
      if (status.working || (status.lastFailed && Date.now() - status.lastFailed > 3600000)) {
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        status.requests++;
        console.log(`🔄 Using Gemini API key ${this.currentIndex + 1}/${this.keys.length} (${key.substring(0, 10)}...)`);
        return key;
      }
      
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;
    }

    throw new Error('All Gemini API keys are currently failing. Wait 1 hour or add more keys.');
  }

  // Mark a key as failed
  markKeyFailed(key, error) {
    const status = this.keyStatus.get(key);
    if (status) {
      status.working = false;
      status.lastFailed = Date.now();
      console.log(`❌ Marked Gemini key ${key.substring(0, 10)}... as failed: ${error}`);
    }
  }

  // Mark a key as working
  markKeyWorking(key) {
    const status = this.keyStatus.get(key);
    if (status) {
      status.working = true;
      status.lastFailed = null;
    }
  }

  // Get status of all keys
  getStatus() {
    return Array.from(this.keyStatus.entries()).map(([key, status]) => ({
      key: key.substring(0, 10) + '...',
      working: status.working,
      requests: status.requests,
      lastFailed: status.lastFailed
    }));
  }
}

const geminiRotator = new GeminiKeyRotator();

// AI Provider Handlers
class AIProviders {
  static async callDeepSeek(apiKey, imageBase64) {
    // DeepSeek currently does not support vision/image analysis
    // The API error shows it doesn't recognize image_url format
    throw new Error('DeepSeek API does not currently support vision/image analysis. Please use a vision-capable provider like:\n• Groq (fast + generous free tier)\n• Gemini (50 requests/day free)\n• GPT-4 Vision (premium quality)\n• Claude (thoughtful analysis)\n\nYou can change the provider in the extension options.');
  }

  static async callGroq(apiKey, imageBase64) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llava-v1.5-7b-4096-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are an AI assistant that helps students with their academic questions. Look at this screenshot and identify any questions, MCQs, fill-in-the-blanks, or problems that need to be solved. Provide direct, concise answers only. For MCQs, give the correct option (A, B, C, D, etc.). For fill-in-the-blanks, provide the missing word/phrase. For short questions, give brief one-sentence answers. For coding questions, provide the solution code. Do NOT describe what you see - only provide the answers to the questions shown."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  }

  static async callHuggingFace(apiKey, imageBase64) {
    const response = await fetch('https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          image: imageBase64,
          question: "You are an AI assistant that helps students with their academic questions. Look at this screenshot and identify any questions, MCQs, fill-in-the-blanks, or problems that need to be solved. Provide direct, concise answers only. For MCQs, give the correct option (A, B, C, D, etc.). For fill-in-the-blanks, provide the missing word/phrase. For short questions, give brief one-sentence answers. For coding questions, provide the solution code. Do NOT describe what you see - only provide the answers to the questions shown."
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Hugging Face API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return result[0]?.generated_text || 'No response generated';
  }

  static async callReplicate(apiKey, imageBase64) {
    // First, create a prediction
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "yorickvp/llava-13b:b5f6212d032508382d61ff00469ddda3e32fd8a0e75dc39d8a4191bb742157fb",
        input: {
          image: `data:image/jpeg;base64,${imageBase64}`,
          prompt: "You are an AI assistant that helps students with their academic questions. Look at this screenshot and identify any questions, MCQs, fill-in-the-blanks, or problems that need to be solved. Provide direct, concise answers only. For MCQs, give the correct option (A, B, C, D, etc.). For fill-in-the-blanks, provide the missing word/phrase. For short questions, give brief one-sentence answers. For coding questions, provide the solution code. Do NOT describe what you see - only provide the answers to the questions shown."
        }
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`Replicate API error: ${createResponse.status} ${JSON.stringify(errorData)}`);
    }

    const prediction = await createResponse.json();
    
    // Poll for result
    let result = prediction;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });
      
      result = await pollResponse.json();
    }

    if (result.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${result.error}`);
    }

    return result.output?.join('') || 'No response generated';
  }

  static async callPerplexity(apiKey, imageBase64) {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are an AI assistant that helps students with their academic questions. Look at this screenshot and identify any questions, MCQs, fill-in-the-blanks, or problems that need to be solved. Provide direct, concise answers only. For MCQs, give the correct option (A, B, C, D, etc.). For fill-in-the-blanks, provide the missing word/phrase. For short questions, give brief one-sentence answers. For coding questions, provide the solution code. Do NOT describe what you see - only provide the answers to the questions shown."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Perplexity API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  }

  static async callMistral(apiKey, imageBase64) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "pixtral-12b-2409",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are an AI assistant that helps students with their academic questions. Look at this screenshot and identify any questions, MCQs, fill-in-the-blanks, or problems that need to be solved. Provide direct, concise answers only. For MCQs, give the correct option (A, B, C, D, etc.). For fill-in-the-blanks, provide the missing word/phrase. For short questions, give brief one-sentence answers. For coding questions, provide the solution code. Do NOT describe what you see - only provide the answers to the questions shown."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Mistral API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  }

  static async callGemini(apiKey, imageBase64) {
    // Handle multiple API keys (comma-separated string or single key)
    if (apiKey.includes(',')) {
      geminiRotator.setKeys(apiKey);
    } else if (geminiRotator.keys.length === 0) {
      geminiRotator.setKeys([apiKey]);
    }

    let lastError;
    let attempts = 0;
    const maxAttempts = Math.min(3, geminiRotator.keys.length);

    while (attempts < maxAttempts) {
      try {
        const currentKey = geminiRotator.getNextKey();
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${currentKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "You are an AI assistant that helps students with their academic questions. Look at this screenshot and identify any questions, MCQs, fill-in-the-blanks, or problems that need to be solved. Provide direct, concise answers only. For MCQs, give the correct option (A, B, C, D, etc.). For fill-in-the-blanks, provide the missing word/phrase. For short questions, give brief one-sentence answers. For coding questions, provide the solution code. Do NOT describe what you see - only provide the answers to the questions shown."
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: imageBase64
                  }
                }
              ]
            }]
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          const error = `Gemini API error: ${response.status} ${JSON.stringify(errorData)}`;
          
          // If quota exceeded (429) or forbidden (403), mark key as failed and try next
          if (response.status === 429 || response.status === 403) {
            geminiRotator.markKeyFailed(currentKey, error);
            lastError = new Error(error);
            attempts++;
            continue;
          } else {
            throw new Error(error);
          }
        }

        const result = await response.json();
        const text = result.candidates[0].content.parts[0].text;
        
        // Mark key as working on success
        geminiRotator.markKeyWorking(currentKey);
        
        return text;
        
      } catch (error) {
        lastError = error;
        attempts++;
        
        if (attempts >= maxAttempts) {
          break;
        }
      }
    }

    // If all attempts failed, throw the last error
    throw lastError || new Error('All Gemini API attempts failed');
  }

  static async callOpenAI(apiKey, imageBase64) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are an AI assistant that helps students with their academic questions. Look at this screenshot and identify any questions, MCQs, fill-in-the-blanks, or problems that need to be solved. Provide direct, concise answers only. For MCQs, give the correct option (A, B, C, D, etc.). For fill-in-the-blanks, provide the missing word/phrase. For short questions, give brief one-sentence answers. For coding questions, provide the solution code. Do NOT describe what you see - only provide the answers to the questions shown."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  }

  static async callClaude(apiKey, imageBase64) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: imageBase64
                }
              },
              {
                type: "text",
                text: "You are an AI assistant that helps students with their academic questions. Look at this screenshot and identify any questions, MCQs, fill-in-the-blanks, or problems that need to be solved. Provide direct, concise answers only. For MCQs, give the correct option (A, B, C, D, etc.). For fill-in-the-blanks, provide the missing word/phrase. For short questions, give brief one-sentence answers. For coding questions, provide the solution code. Do NOT describe what you see - only provide the answers to the questions shown."
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return result.content[0].text;
  }

  static async callOllama(baseUrl, model, imageBase64) {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'llava',
        prompt: 'You are an AI assistant that helps students with their academic questions. Look at this screenshot and identify any questions, MCQs, fill-in-the-blanks, or problems that need to be solved. Provide direct, concise answers only. For MCQs, give the correct option (A, B, C, D, etc.). For fill-in-the-blanks, provide the missing word/phrase. For short questions, give brief one-sentence answers. For coding questions, provide the solution code. Do NOT describe what you see - only provide the answers to the questions shown.',
        images: [imageBase64],
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Ollama API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return result.response;
  }
}

// Multi-provider analyze endpoint
app.post('/analyze', async (req, res) => {
  console.log('📸 Multi-AI API request received');
  
  stats.totalRequests++;
  
  const { image, format, provider = 'gemini', model, baseUrl } = req.body;
  
  if (!image) {
    return res.status(400).json({ 
      error: 'Missing image data' 
    });
  }

  // Get API key from headers
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Missing or invalid Authorization header' 
    });
  }

  const apiKey = authHeader.substring(7);
  console.log(`🔑 Using ${provider.toUpperCase()} API Key:`, apiKey.substring(0, 10) + '...');
  
  stats.providers[provider].requests++;
  
  try {
    const startTime = Date.now();
    console.log(`📊 Processing image with ${provider.toUpperCase()}...`);
    
    let answer;
    
    switch (provider.toLowerCase()) {
      case 'deepseek':
        answer = await AIProviders.callDeepSeek(apiKey, image);
        break;
      
      case 'groq':
        answer = await AIProviders.callGroq(apiKey, image);
        break;
      
      case 'huggingface':
        answer = await AIProviders.callHuggingFace(apiKey, image);
        break;
      
      case 'replicate':
        answer = await AIProviders.callReplicate(apiKey, image);
        break;
      
      case 'perplexity':
        answer = await AIProviders.callPerplexity(apiKey, image);
        break;
      
      case 'mistral':
        answer = await AIProviders.callMistral(apiKey, image);
        break;
      
      case 'gemini':
        answer = await AIProviders.callGemini(apiKey, image);
        break;
      
      case 'openai':
        answer = await AIProviders.callOpenAI(apiKey, image);
        break;
      
      case 'claude':
        answer = await AIProviders.callClaude(apiKey, image);
        break;
      
      case 'ollama':
        answer = await AIProviders.callOllama(baseUrl || 'http://localhost:11434', model, image);
        break;
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    stats.successfulRequests++;
    stats.providers[provider].successes++;
    
    console.log(`✅ ${provider.toUpperCase()} response received`);
    
    res.json({ 
      answer,
      provider,
      model: model || 'default',
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error(`❌ ${provider.toUpperCase()} API error:`, error.message);
    
    stats.failedRequests++;
    stats.providers[provider].failures++;
    
    res.status(500).json({
      error: error.message,
      provider,
      suggestion: getErrorSuggestion(provider, error.message)
    });
  }
});

function getErrorSuggestion(provider, errorMessage) {
  const suggestions = {
    deepseek: {
      '429': 'DeepSeek API rate limit exceeded. Check your plan.',
      '401': 'Invalid DeepSeek API key.',
      '400': 'Invalid request format for DeepSeek API.'
    },
    groq: {
      '429': 'Groq API rate limit exceeded. Very generous free tier available.',
      '401': 'Invalid Groq API key.',
      '400': 'Invalid request format for Groq API.'
    },
    huggingface: {
      '429': 'Hugging Face rate limit exceeded. Try again later.',
      '401': 'Invalid Hugging Face API key.',
      '503': 'Model is loading. Wait a few seconds and retry.'
    },
    replicate: {
      '429': 'Replicate rate limit exceeded.',
      '401': 'Invalid Replicate API key.',
      '402': 'Replicate billing issue - check your account.'
    },
    perplexity: {
      '429': 'Perplexity API rate limit exceeded.',
      '401': 'Invalid Perplexity API key.',
      '400': 'Invalid request format for Perplexity API.'
    },
    mistral: {
      '429': 'Mistral API rate limit exceeded.',
      '401': 'Invalid Mistral API key.',
      '400': 'Invalid request format for Mistral API.'
    },
    gemini: {
      '429': 'Gemini API quota exceeded. Wait for reset or upgrade to paid plan.',
      '403': 'Invalid Gemini API key or insufficient permissions.',
      '400': 'Invalid request format for Gemini API.'
    },
    openai: {
      '429': 'OpenAI API rate limit exceeded. Wait or upgrade plan.',
      '401': 'Invalid OpenAI API key.',
      '402': 'OpenAI billing issue - check your account.'
    },
    claude: {
      '429': 'Claude API rate limit exceeded.',
      '401': 'Invalid Claude API key.',
      '400': 'Invalid request format for Claude API.'
    },
    ollama: {
      'ECONNREFUSED': 'Ollama server not running. Start with: ollama serve',
      '404': 'Model not found. Pull with: ollama pull llava'
    }
  };

  const providerSuggestions = suggestions[provider] || {};
  
  for (const [code, suggestion] of Object.entries(providerSuggestions)) {
    if (errorMessage.includes(code)) {
      return suggestion;
    }
  }
  
  return `Check your ${provider.toUpperCase()} API configuration and try again.`;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Math.floor((Date.now() - stats.startTime) / 1000) + 's',
    supportedProviders: ['gemini', 'openai', 'claude', 'ollama']
  });
});

// Statistics endpoint
app.get('/stats', (req, res) => {
  res.json({
    ...stats,
    uptime: Math.floor((Date.now() - stats.startTime) / 1000) + 's'
  });
});

// Provider configuration endpoint
app.get('/providers', (req, res) => {
  res.json({
    providers: {
      deepseek: {
        name: 'DeepSeek Chat (Vision Capable)',
        models: ['deepseek-chat'],
        authType: 'API Key',
        endpoint: 'api.deepseek.com',
        cost: 'Very affordable',
        speed: 'Fast'
      },
      groq: {
        name: 'Groq (Lightning Fast)',
        models: ['llava-v1.5-7b-4096-preview'],
        authType: 'API Key',
        endpoint: 'api.groq.com',
        cost: 'Generous free tier',
        speed: 'Ultra fast'
      },
      huggingface: {
        name: 'Hugging Face',
        models: ['llava-1.5-7b-hf'],
        authType: 'API Key',
        endpoint: 'api-inference.huggingface.co',
        cost: 'Free tier available',
        speed: 'Medium'
      },
      replicate: {
        name: 'Replicate',
        models: ['llava-13b'],
        authType: 'API Key',
        endpoint: 'api.replicate.com',
        cost: 'Pay per use',
        speed: 'Medium (high quality)'
      },
      perplexity: {
        name: 'Perplexity AI',
        models: ['sonar-pro', 'sonar'],
        authType: 'API Key',
        endpoint: 'api.perplexity.ai',
        cost: 'Paid',
        speed: 'Fast'
      },
      mistral: {
        name: 'Mistral Pixtral',
        models: ['pixtral-12b-2409'],
        authType: 'API Key',
        endpoint: 'api.mistral.ai',
        cost: 'Competitive pricing',
        speed: 'Fast'
      },
      gemini: {
        name: 'Google Gemini',
        models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'],
        authType: 'API Key',
        endpoint: 'generativelanguage.googleapis.com',
        cost: '50 free/day',
        speed: 'Fast'
      },
      openai: {
        name: 'OpenAI GPT-4 Vision',
        models: ['gpt-4-vision-preview', 'gpt-4o'],
        authType: 'Bearer Token',
        endpoint: 'api.openai.com',
        cost: 'Premium pricing',
        speed: 'Medium (high quality)'
      },
      claude: {
        name: 'Anthropic Claude',
        models: ['claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
        authType: 'API Key',
        endpoint: 'api.anthropic.com',
        cost: 'Premium pricing',
        speed: 'Medium (thoughtful)'
      },
      ollama: {
        name: 'Ollama (Local)',
        models: ['llava', 'llava:13b', 'bakllava'],
        authType: 'None (Local)',
        endpoint: 'localhost:11434',
        cost: 'Free (local)',
        speed: 'Depends on hardware'
      }
    }
  });
});

// Gemini API Keys Status endpoint
app.get('/gemini-keys', (req, res) => {
  const status = geminiRotator.getStatus();
  
  res.json({
    message: 'Gemini API Keys Status',
    timestamp: new Date().toISOString(),
    totalKeys: status.length,
    workingKeys: status.filter(k => k.working).length,
    failedKeys: status.filter(k => !k.working).length,
    keys: status,
    info: {
      rotationType: 'Round-robin with failure detection',
      retryAfter: '1 hour for failed keys',
      maxAttempts: 3
    }
  });
});

app.listen(port, () => {
  console.log('🤖 Universal AI Screenshot Analysis Backend');
  console.log('==========================================');
  console.log(`📡 Server running at: http://localhost:${port}`);
  console.log(`🔗 API endpoint: http://localhost:${port}/analyze`);
  console.log(`❤️  Health check: http://localhost:${port}/health`);
  console.log(`📊 Statistics: http://localhost:${port}/stats`);
  console.log(`🔧 Providers: http://localhost:${port}/providers`);
  console.log(`🔑 Gemini Keys: http://localhost:${port}/gemini-keys`);
  console.log('');
  console.log('🚀 Supported AI Providers (9 total):');
  console.log('   ⚡ Groq (llava-v1.5-7b) - Lightning fast, generous free tier');
  console.log('   🤗 Hugging Face (llava-1.5-7b-hf) - Free tier available');
  console.log('   🔄 Replicate (llava-13b) - High quality, pay per use');
  console.log('   🧠 Perplexity AI (sonar-pro) - Research focused');
  console.log('   🎭 Mistral Pixtral (pixtral-12b-2409) - European AI');
  console.log('   🟢 Google Gemini (gemini-1.5-flash/pro) - 50 free/day');
  console.log('   🟡 OpenAI GPT-4 Vision (gpt-4o) - Premium quality');
  console.log('   🔵 Anthropic Claude (claude-3-sonnet/opus) - Thoughtful analysis');
  console.log('   🟠 Ollama Local (llava/bakllava) - Free, runs locally');
  console.log('');
  console.log('� Quick Start:');
  console.log('   • Out of Gemini quota? Try Groq (super fast + generous free tier)');
  console.log('   • Want free unlimited? Try Ollama (runs on your computer)');
  console.log('   • Want best quality? Try GPT-4o or Claude');
  console.log('');
  console.log('📋 Usage Example:');
  console.log('   POST /analyze with body: { "provider": "groq", "image": "base64..." }');
  console.log('');
  console.log('🔑 API Key via Authorization header: Bearer YOUR_API_KEY');
});
