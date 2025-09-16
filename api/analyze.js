// AI Analysis API for Vercel

// Gemini Key Rotation Manager
class GeminiKeyRotator {
  constructor() {
    this.keys = [];
    this.currentIndex = 0;
    this.keyStatuses = new Map();
  }

  setKeys(keys) {
    this.keys = keys;
    this.keyStatuses.clear();
    keys.forEach(key => {
      this.keyStatuses.set(key, {
        isWorking: true,
        lastFailed: null,
        requestCount: 0
      });
    });
  }

  getNextKey() {
    if (this.keys.length === 0) return null;
    
    let attempts = 0;
    while (attempts < this.keys.length) {
      const key = this.keys[this.currentIndex];
      const status = this.keyStatuses.get(key);
      
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      
      if (status && status.isWorking) {
        status.requestCount++;
        return key;
      }
      
      attempts++;
    }
    
    return this.keys[0];
  }
}

const geminiRotator = new GeminiKeyRotator();

// AI Provider Functions
async function callGemini(apiKey, imageBase64) {
  if (apiKey && apiKey.includes(',')) {
    const keys = apiKey.split(',').map(k => k.trim()).filter(k => k.length > 0);
    geminiRotator.setKeys(keys);
  } else if (apiKey) {
    geminiRotator.setKeys([apiKey]);
  } else {
    throw new Error('No Gemini API key provided');
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
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.candidates && result.candidates[0] && result.candidates[0].content) {
          return result.candidates[0].content.parts[0].text;
        }
      }

      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);

    } catch (error) {
      attempts++;
      lastError = error;
      console.log(`Gemini attempt ${attempts} failed:`, error.message);
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError;
}

async function callGroq(apiKey, imageBase64) {
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
      max_tokens: 500,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

async function callOpenAI(apiKey, imageBase64) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "gpt-4o",
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
      max_tokens: 500,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

async function callClaude(apiKey, imageBase64) {
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
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.content[0].text;
}

// Main Handler - Use CommonJS export for Vercel
module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'running',
      message: '🤖 AI Screenshot Analysis API - Vercel Deployment',
      providers: ['gemini', 'groq', 'openai', 'claude'],
      endpoint: '/api/analyze'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider = 'gemini', image } = req.body;
    const authHeader = req.headers.authorization;
    const apiKey = authHeader ? authHeader.replace('Bearer ', '') : null;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!apiKey) {
      return res.status(401).json({ 
        error: 'No API key provided',
        message: 'Please add your API key in the Chrome extension options page'
      });
    }

    console.log(`📸 Processing request with ${provider.toUpperCase()}`);

    let answer;
    
    switch (provider.toLowerCase()) {
      case 'gemini':
        answer = await callGemini(apiKey, image);
        break;
      case 'groq':
        answer = await callGroq(apiKey, image);
        break;
      case 'openai':
        answer = await callOpenAI(apiKey, image);
        break;
      case 'claude':
        answer = await callClaude(apiKey, image);
        break;
      default:
        return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    console.log(`✅ ${provider.toUpperCase()} response received`);
    
    return res.status(200).json({ 
      success: true, 
      answer,
      provider,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
