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
    gemini: { requests: 0, successes: 0, failures: 0 }
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

// Enhanced prompts with verification system
class PromptEngine {
  static getEnhancedPrompt() {
    return `You are an expert at reading text from screenshots and solving academic problems. This is a screenshot of a webpage or document containing questions.

CRITICAL: READ ALL TEXT IN THE IMAGE FIRST
- Examine the entire image from top to bottom
- Read all visible text, including small text and numbers
- Look for question numbers, multiple choice options, equations, tables
- Pay special attention to mathematical formulas, code, and technical terms

QUESTION IDENTIFICATION:
- Look for questions that ask "What is...", "Calculate...", "Choose the correct...", etc.
- Find multiple choice options labeled (a), (b), (c), (d) or A, B, C, D
- Identify fill-in-the-blank spaces or missing values
- Look for True/False questions

ANSWER FORMAT (CRITICAL):
- Multiple Choice Questions: Answer ONLY with the letter (A, B, C, D)
- Calculations: Give ONLY the numerical result
- Fill-in-blanks: Give ONLY the missing word/phrase  
- True/False: Answer ONLY "True" or "False"
- If multiple questions, number them: 1. A  2. B  3. 42

ACCURACY RULES:
- Double-check any calculations you see
- For technical subjects, use proper formulas and methods
- If text is unclear, analyze the context to make the best determination
- Never guess randomly - use academic knowledge to deduce answers

DO NOT:
- Explain your reasoning or show work
- Ask for clarification or more information
- Describe what you see in the image
- Give multiple possible answers

ANALYZE THE SCREENSHOT AND PROVIDE DIRECT ANSWERS:`;
  }

  static getVerificationPrompt(originalAnswer, questionContext) {
    return `The original answer was: "${originalAnswer}"

Simply respond with ONLY:
- If correct: "VERIFIED: ${originalAnswer}"  
- If incorrect: Just the correct answer (A, B, C, D, or number)

No explanations. No questions. Just verify or correct.`;
  }

  static getConfidenceAnalysisPrompt(answer) {
    return `Analyze the confidence level of this academic answer and determine if it meets publication standards.

ANSWER TO EVALUATE:
${answer}

CONFIDENCE CRITERIA:
- Factual accuracy and verifiability
- Methodological soundness
- Completeness of response
- Clarity and precision
- Absence of ambiguity

SCORING SYSTEM:
- 95-100%: Publication ready, highly confident
- 85-94%: Good quality, minor uncertainty
- 70-84%: Moderate confidence, some concerns
- Below 70%: Low confidence, needs review

Provide:
1. Confidence percentage (0-100%)
2. Specific strengths identified
3. Any concerns or weaknesses
4. Recommendation (ACCEPT/REVISE/REJECT)

Format: CONFIDENCE: [X]% | RECOMMENDATION: [STATUS] | ANALYSIS: [details]`;
  }
}

// AI Provider Handlers
class AIProviders {
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
        
        // First pass - Enhanced analysis
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${currentKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: PromptEngine.getEnhancedPrompt()
                },
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: imageBase64
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1, // Lower temperature for more focused, accurate responses
              maxOutputTokens: 1000
            }
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
        const initialAnswer = result.candidates[0].content.parts[0].text;
        
        // Skip verification for now to avoid confusion
        
        // Mark key as working on success
        geminiRotator.markKeyWorking(currentKey);
        
        return initialAnswer;
        
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
}

// Enhanced answer processing with confidence scoring
class AnswerProcessor {
  static async processWithConfidenceCheck(provider, apiKey, image, baseUrl, model) {
    let answer;
    let confidence = 0;
    let attempts = 0;
    const maxAttempts = 2; // Allow one retry for low confidence

    while (attempts < maxAttempts && confidence < 85) {
      attempts++;
      console.log(`� Attempt ${attempts} for ${provider.toUpperCase()}`);

      // Get initial answer
      switch (provider.toLowerCase()) {
        case 'gemini':
          answer = await AIProviders.callGemini(apiKey, image);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Check confidence for providers that support it
      if (['gemini'].includes(provider.toLowerCase())) {
        try {
          confidence = await this.getConfidenceScore(provider, apiKey, answer);
          console.log(`📊 Confidence score: ${confidence}%`);
          
          if (confidence < 85 && attempts < maxAttempts) {
            console.log(`⚠️ Low confidence (${confidence}%), retrying...`);
            continue;
          }
        } catch (confidenceError) {
          console.log('Confidence check failed, using answer as-is:', confidenceError.message);
          confidence = 75; // Default moderate confidence
          break;
        }
      } else {
        confidence = 80; // Default confidence for other providers
        break;
      }
    }

    return {
      answer,
      confidence,
      attempts,
      qualityScore: this.calculateQualityScore(answer, confidence)
    };
  }

  static async getConfidenceScore(provider, apiKey, answer) {
    const confidencePrompt = PromptEngine.getConfidenceAnalysisPrompt(answer);
    
    try {
      let response;
      
      switch (provider.toLowerCase()) {
        case 'gemini':
          const currentKey = geminiRotator.getNextKey();
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${currentKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: confidencePrompt }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            const analysis = result.candidates[0].content.parts[0].text;
            return this.extractConfidence(analysis);
          }
          break;
      }
    } catch (error) {
      console.log('Confidence analysis failed:', error.message);
    }
    
    return 75; // Default confidence if analysis fails
  }

  static extractConfidence(analysisText) {
    // Extract confidence percentage from analysis text
    const confidenceMatch = analysisText.match(/CONFIDENCE:\s*(\d+)%/i);
    if (confidenceMatch) {
      return parseInt(confidenceMatch[1]);
    }
    
    // Fallback pattern matching
    const percentMatch = analysisText.match(/(\d+)%/);
    if (percentMatch) {
      return parseInt(percentMatch[1]);
    }
    
    return 75; // Default if no percentage found
  }

  static calculateQualityScore(answer, confidence) {
    let score = confidence;
    
    // Bonus points for structured answers
    if (answer.includes('\n') || answer.length > 50) score += 5;
    
    // Bonus for specific formatting (MCQ answers, numbers, etc.)
    if (/^[A-E]\.?\s*$/.test(answer.trim())) score += 10; // MCQ format
    if (/\d+/.test(answer)) score += 5; // Contains numbers
    
    // Penalty for vague language
    if (answer.includes('might') || answer.includes('possibly') || answer.includes('unclear')) {
      score -= 10;
    }
    
    return Math.min(100, Math.max(0, score));
  }
}

// Multi-provider analyze endpoint with enhanced processing
app.post('/analyze', async (req, res) => {
  console.log('📸 Multi-AI API request received');
  
  stats.totalRequests++;
  
  const { image, format, provider = 'gemini', model, baseUrl } = req.body;
  
  if (!image) {
    return res.status(400).json({ 
      error: 'Missing image data' 
    });
  }

  // Hardcoded Gemini API key
  const apiKey = '';
  console.log(`🔑 Using ${provider.toUpperCase()} API Key:`, apiKey.substring(0, 10) + '...');
  
  stats.providers[provider].requests++;
  
  try {
    const startTime = Date.now();
    console.log(`📊 Processing image with enhanced analysis using ${provider.toUpperCase()}...`);
    
    const result = await AnswerProcessor.processWithConfidenceCheck(
      provider, apiKey, image, baseUrl, model
    );

    stats.successfulRequests++;
    stats.providers[provider].successes++;
    
    console.log(`✅ ${provider.toUpperCase()} response: Quality ${result.qualityScore}%, Confidence ${result.confidence}%`);
    
    res.json({ 
      answer: result.answer,
      provider,
      model: model || 'default',
      processingTime: Date.now() - startTime,
      confidence: result.confidence,
      qualityScore: result.qualityScore,
      attempts: result.attempts,
      enhanced: true
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
    gemini: {
      '429': 'Gemini API quota exceeded. Wait for reset or upgrade to paid plan.',
      '403': 'Invalid Gemini API key or insufficient permissions.',
      '400': 'Invalid request format for Gemini API.'
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
    supportedProviders: ['gemini']
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
      gemini: {
        name: 'Google Gemini 2.0 Flash',
        models: ['gemini-2.0-flash'],
        authType: 'API Key',
        endpoint: 'generativelanguage.googleapis.com',
        cost: 'Free tier available',
        speed: 'Fast'
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
  console.log('🤖 Gemini 2.0 Flash AI Screenshot Analysis Backend');
  console.log('===============================================');
  console.log(`📡 Server running at: http://localhost:${port}`);
  console.log(`🔗 API endpoint: http://localhost:${port}/analyze`);
  console.log(`❤️  Health check: http://localhost:${port}/health`);
  console.log(`📊 Statistics: http://localhost:${port}/stats`);
  console.log(`🔧 Providers: http://localhost:${port}/providers`);
  console.log(`🔑 Gemini Keys: http://localhost:${port}/gemini-keys`);
  console.log('');
  console.log('🚀 Supported AI Provider:');
  console.log('   🟢 Google Gemini 2.0 Flash (gemini-2.0-flash) - Latest Google AI');
  console.log('');
  console.log('💡 Features:');
  console.log('   • Multimodal vision and text understanding');
  console.log('   • Enhanced accuracy for academic questions');
  console.log('   • Multiple API key rotation support');
  console.log('   • Automatic retry on failures');
  console.log('');
  console.log('📋 Usage Example:');
  console.log('   POST /analyze with body: { "provider": "gemini", "image": "base64..." }');
  console.log('');
  console.log('🔑 API Key: Hardcoded in backend - no configuration needed!');
});
