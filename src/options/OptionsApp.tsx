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
  model: 'gemini-2.0-flash',
  ollamaBaseUrl: 'http://localhost:11434'
};

const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    // Load settings when component mounts
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      const loadedSettings = items as ExtensionSettings;
      // Force Gemini as default
      if (!loadedSettings.provider || loadedSettings.provider !== 'gemini') {
        loadedSettings.provider = 'gemini';
        loadedSettings.model = 'gemini-2.0-flash';
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
          <div style={{
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e1e5e9',
            borderRadius: '8px',
            fontSize: '14px',
            boxSizing: 'border-box',
            background: '#f8f9fa',
            color: '#666'
          }}>
            🟢 Google Gemini 2.0 Flash - Latest Google AI
          </div>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: '#666'
          }}>
            Latest Google AI with enhanced speed and capabilities
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
          <div style={{
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e1e5e9',
            borderRadius: '8px',
            fontSize: '14px',
            boxSizing: 'border-box',
            background: '#f8f9fa',
            color: '#666'
          }}>
            gemini-2.0-flash
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#333'
          }}>
            Gemini API Key
          </label>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            placeholder="Enter your Gemini API key"
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
          <div style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#666',
            lineHeight: '1.4'
          }}>
            💡 <strong>Get your API key:</strong> Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" style={{ color: '#667eea' }}>Google AI Studio</a> to create your free Gemini API key.
          </div>
        </div>

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
