import React, { useState, useEffect } from 'react';

interface ExtensionSettings {
  apiKey: string;
  backendUrl: string;
  jpegQuality: number;
  provider: string;
  model: string;
  ollamaBaseUrl: string;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  backendUrl: 'http://localhost:3002/analyze',
  jpegQuality: 80,
  provider: 'gemini',
  model: 'gemini-2.5-pro',
  ollamaBaseUrl: 'http://localhost:11434'
};

const AI_PROVIDERS = {
  gemini: {
    name: '🟢 Google Gemini (Multi-Key Support)',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-2.5-pro'],
    needsApiKey: true,
    description: 'Google\'s multimodal AI - Use multiple API keys for increased quota (comma-separated)'
  },
  groq: {
    name: '⚡ Groq (Lightning Fast)',
    models: ['llava-v1.5-7b-4096-preview'],
    needsApiKey: true,
    description: 'Ultra-fast inference with generous free tier - great Gemini alternative!'
  },
  huggingface: {
    name: '🤗 Hugging Face',
    models: ['llava-1.5-7b-hf'],
    needsApiKey: true,
    description: 'Open source models with free tier available'
  },
  replicate: {
    name: '🔄 Replicate',
    models: ['llava-13b'],
    needsApiKey: true,
    description: 'High-quality models, pay per use'
  },
  perplexity: {
    name: '🧠 Perplexity AI',
    models: ['sonar-pro', 'sonar'],
    needsApiKey: true,
    description: 'Research-focused AI with vision capabilities'
  },
  mistral: {
    name: '🎭 Mistral Pixtral',
    models: ['pixtral-12b-2409'],
    needsApiKey: true,
    description: 'European AI with competitive pricing'
  },
  openai: {
    name: '🟡 OpenAI GPT-4 Vision',
    models: ['gpt-4-vision-preview', 'gpt-4o'],
    needsApiKey: true,
    description: 'Premium quality vision analysis'
  },
  claude: {
    name: '🔵 Anthropic Claude',
    models: ['claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
    needsApiKey: true,
    description: 'Thoughtful, nuanced image analysis'
  },
  ollama: {
    name: '🟠 Ollama (Local)',
    models: ['llava', 'llava:13b', 'bakllava'],
    needsApiKey: false,
    description: 'Free unlimited usage - runs on your computer'
  }
};

const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    // Load settings when component mounts
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      const loadedSettings = items as ExtensionSettings;
      // Force Gemini as default if no provider is set or if it's the old default
      if (!loadedSettings.provider || loadedSettings.provider === 'groq') {
        loadedSettings.provider = 'gemini';
        loadedSettings.model = 'gemini-1.5-flash';
      }
      setSettings(loadedSettings);
    });
  }, []);

  const handleInputChange = (field: keyof ExtensionSettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      await new Promise<void>((resolve) => {
        chrome.storage.sync.set(settings, () => {
          resolve();
        });
      });

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Error saving settings. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setSaveMessage('Settings reset to defaults. Click Save to apply.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '500px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <h1 style={{
            margin: '0 0 10px 0',
            color: '#333',
            fontSize: '28px',
            fontWeight: '600'
          }}>
            AI Screenshot Assistant
          </h1>
          <p style={{
            margin: '0',
            color: '#666',
            fontSize: '16px'
          }}>
            Configure your AI backend settings
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#333'
          }}>
            AI Provider
          </label>
          <select
            value={settings.provider}
            onChange={(e) => {
              handleInputChange('provider', e.target.value);
              // Set default model for selected provider
              const provider = AI_PROVIDERS[e.target.value as keyof typeof AI_PROVIDERS];
              if (provider) {
                handleInputChange('model', provider.models[0]);
              }
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box',
              background: 'white'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
          >
            {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
              <option key={key} value={key}>
                {provider.name}
              </option>
            ))}
          </select>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: '#666'
          }}>
            {AI_PROVIDERS[settings.provider as keyof typeof AI_PROVIDERS]?.description}
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#333'
          }}>
            Model
          </label>
          <select
            value={settings.model}
            onChange={(e) => handleInputChange('model', e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box',
              background: 'white'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
          >
            {AI_PROVIDERS[settings.provider as keyof typeof AI_PROVIDERS]?.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {AI_PROVIDERS[settings.provider as keyof typeof AI_PROVIDERS]?.needsApiKey && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333'
            }}>
              API Key{settings.provider === 'gemini' ? 's (Multiple Supported)' : ''}
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              placeholder={settings.provider === 'gemini' 
                ? 'Enter Gemini API keys (comma-separated for rotation): key1,key2,key3'
                : `Enter your ${AI_PROVIDERS[settings.provider as keyof typeof AI_PROVIDERS]?.name} API key`
              }
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
            {settings.provider === 'gemini' && (
              <div style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#666',
                lineHeight: '1.4'
              }}>
                💡 <strong>Pro Tip:</strong> Create multiple Gemini API keys from different Google Cloud projects or accounts to increase your daily quota from 50 to 150+ requests/day. The extension will automatically rotate between keys when one hits the limit.
              </div>
            )}
          </div>
        )}

        {settings.provider === 'ollama' && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333'
            }}>
              Ollama Base URL
            </label>
            <input
              type="url"
              value={settings.ollamaBaseUrl}
              onChange={(e) => handleInputChange('ollamaBaseUrl', e.target.value)}
              placeholder="http://localhost:11434"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: '#666'
            }}>
              Make sure Ollama is running: <code>ollama serve</code>
            </p>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#333'
          }}>
            Backend URL
          </label>
          <input
            type="url"
            value={settings.backendUrl}
            onChange={(e) => handleInputChange('backendUrl', e.target.value)}
            placeholder="https://your-backend.com/api/analyze"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
          />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#333'
          }}>
            JPEG Quality: {settings.jpegQuality}%
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ color: '#666', fontSize: '14px' }}>Speed</span>
            <input
              type="range"
              min="50"
              max="100"
              value={settings.jpegQuality}
              onChange={(e) => handleInputChange('jpegQuality', parseInt(e.target.value))}
              style={{
                flex: '1',
                height: '6px',
                background: '#e1e5e9',
                borderRadius: '3px',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <span style={{ color: '#666', fontSize: '14px' }}>Quality</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '4px',
            fontSize: '12px',
            color: '#999'
          }}>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: '1',
              padding: '12px 24px',
              background: isSaving ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s ease'
            }}
            onMouseDown={(e) => {
              if (!isSaving) {
                (e.target as HTMLButtonElement).style.transform = 'scale(0.98)';
              }
            }}
            onMouseUp={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>

          <button
            onClick={handleReset}
            disabled={isSaving}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                (e.target as HTMLButtonElement).style.background = '#667eea';
                (e.target as HTMLButtonElement).style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'transparent';
              (e.target as HTMLButtonElement).style.color = '#667eea';
            }}
          >
            Reset
          </button>
        </div>

        {saveMessage && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '14px',
            background: saveMessage.includes('Error') ? 
              'rgba(255, 0, 0, 0.1)' : 'rgba(0, 128, 0, 0.1)',
            color: saveMessage.includes('Error') ? '#d63031' : '#00b894',
            border: `1px solid ${saveMessage.includes('Error') ? '#d63031' : '#00b894'}`
          }}>
            {saveMessage}
          </div>
        )}

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(102, 126, 234, 0.1)',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#666'
        }}>
          <strong>How to use:</strong>
          <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Save your API key and backend URL above</li>
            <li>Navigate to any webpage</li>
            <li>Click the AI dot in the top-right corner</li>
            <li>The extension will capture and analyze the page</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default OptionsApp;
