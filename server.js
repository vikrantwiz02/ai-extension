import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static('dist'));

// Health check route
app.get('/api', (req, res) => {
  res.json({
    status: 'working',
    message: '🎉 Render API is working!',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method
  });
});

// AI Analysis route
app.post('/api/analyze', async (req, res) => {
  try {
    const { imageData, provider, apiKey, model, prompt } = req.body;

    if (!imageData || !provider || !apiKey) {
      return res.status(400).json({
        error: 'Missing required fields: imageData, provider, and apiKey are required'
      });
    }

    // Remove data URL prefix to get base64 data
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    let response;
    let requestBody;
    let headers;

    switch (provider) {
      case 'gemini':
        const geminiModel = model || 'gemini-1.5-flash';
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt || "Analyze this image and describe what you see." },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data
                  }
                }
              ]
            }]
          })
        });
        break;

      case 'groq':
        const groqModel = model || 'llama-3.2-11b-vision-preview';
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt || "Analyze this image and describe what you see." },
                  { type: "image_url", image_url: { url: imageData } }
                ]
              }
            ],
            max_tokens: 1000
          })
        });
        break;

      case 'openai':
        const openaiModel = model || 'gpt-4o';
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: openaiModel,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt || "Analyze this image and describe what you see." },
                  { type: "image_url", image_url: { url: imageData } }
                ]
              }
            ],
            max_tokens: 1000
          })
        });
        break;

      case 'claude':
        const claudeModel = model || 'claude-3-5-sonnet-20241022';
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: claudeModel,
            max_tokens: 1000,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt || "Analyze this image and describe what you see." },
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: "image/jpeg",
                      data: base64Data
                    }
                  }
                ]
              }
            ]
          })
        });
        break;

      default:
        return res.status(400).json({ error: 'Unsupported provider' });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      return res.status(response.status).json({
        error: `API request failed: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    
    // Parse response based on provider
    let analysisResult;
    switch (provider) {
      case 'gemini':
        analysisResult = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';
        break;
      case 'groq':
      case 'openai':
        analysisResult = data.choices?.[0]?.message?.content || 'No analysis available';
        break;
      case 'claude':
        analysisResult = data.content?.[0]?.text || 'No analysis available';
        break;
      default:
        analysisResult = 'No analysis available';
    }

    res.json({
      analysis: analysisResult,
      provider,
      model: model || 'default',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Serve static files (Chrome extension files)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) {
      res.json({ message: 'Chrome Extension AI Assistant API Server', status: 'running' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api`);
});
