# Deployment Instructions for Render

## Render Configuration

### Build & Deploy Settings:
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Node Version:** 18 or 20
- **Port:** Will auto-detect from environment (defaults to 3002 locally)

### Environment Variables:
No environment variables needed - users configure API keys in the Chrome extension via Authorization header.

### API Endpoints:
- Health check: `GET /health`
- AI Analysis: `POST /analyze`
- Statistics: `GET /stats`
- Provider info: `GET /providers`
- Gemini key status: `GET /gemini-keys`

### Supported AI Providers (10 total):
- DeepSeek Vision (very affordable)
- Groq (lightning fast, generous free tier)
- Hugging Face (free tier available)
- Replicate (high quality, pay per use)
- Perplexity AI (research focused)
- Mistral Pixtral (European AI)
- Google Gemini (50 free/day, API key rotation)
- OpenAI GPT-4 Vision (premium quality)
- Anthropic Claude (thoughtful analysis)
- Ollama Local (free, runs locally)

## Local Development:
```bash
npm install
npm run build
npm start
```

Server runs on port 3002 locally (or PORT environment variable on Render).

## Usage:
```bash
POST /analyze
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "provider": "groq",
  "image": "base64_image_data",
  "model": "llava-v1.5-7b-4096-preview"
}
```
