import React, { useState } from 'react';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError('Bitte geben Sie eine Beschreibung für das Bild ein');
      return;
    }

    setIsGenerating(true);
    setError('');
    setImageUrl(null);
    setStatus('Starte Bildgenerierung mit Leonardo AI...');

    try {
      // Step 1: Start the image generation
      const response = await fetch('/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          action: 'generate'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to start image generation');
      }

      const taskId = data.taskId;
      setStatus('Bildgenerierung gestartet, Verarbeitung läuft...');

      // Step 2: Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch('/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              taskId,
              action: 'status'
            }),
          });

          if (!statusResponse.ok) {
            throw new Error(`HTTP error! status: ${statusResponse.status}`);
          }

          const statusData = await statusResponse.json();
          
          if (!statusData.success) {
            throw new Error(statusData.error || 'Failed to check status');
          }

          setStatus(`Status: ${statusData.status}`);

          if (statusData.status === 'COMPLETE') {
            setImageUrl(statusData.imageUrl);
            setStatus('Bildgenerierung abgeschlossen!');
            setIsGenerating(false);
            clearInterval(pollInterval);
          } else if (statusData.status === 'FAILED') {
            throw new Error(statusData.failure || 'Image generation failed');
          }

        } catch (pollError) {
          console.error('Polling error:', pollError);
          setError(pollError.message);
          setIsGenerating(false);
          clearInterval(pollInterval);
        }
      }, 3000); // Poll every 3 seconds

      // Set a timeout to stop polling after 2 minutes for image generation
      setTimeout(() => {
        if (isGenerating) {
          clearInterval(pollInterval);
          setError('Bildgenerierung hat Zeitlimit überschritten');
          setIsGenerating(false);
        }
      }, 120000);

    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Leonardo AI Image Generator</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Image Prompt:
        </label>
        <textarea
          placeholder="Beschreiben Sie das gewünschte Bild vollständig (z.B. 'Ein majestätischer Kristallwal gleitet durch einen nächtlichen Himmel')"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          style={{ 
            width: '100%', 
            padding: '10px', 
            fontSize: '16px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            resize: 'vertical',
            minHeight: '80px'
          }}
        />
      </div>

      <button 
        onClick={generateImage}
        disabled={isGenerating || !prompt.trim()}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: (isGenerating || !prompt.trim()) ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: (isGenerating || !prompt.trim()) ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {isGenerating ? 'Generiere Bild...' : 'Bild generieren (1024x1024px)'}
      </button>

      {status && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <p>{status}</p>
        </div>
      )}

      {error && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          borderRadius: '4px'
        }}>
          Error: {error}
        </div>
      )}

      {imageUrl && (
        <div style={{ marginTop: '20px' }}>
          <h3>Generated Image:</h3>
          <img 
            alt={prompt}
            style={{ width: '100%', maxWidth: '512px', borderRadius: '8px' }}
            src={imageUrl}
          />
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            <a href={imageUrl} target="_blank" rel="noopener noreferrer">
              Open image in new tab
            </a>
          </p>
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <p><strong>Provider:</strong> Leonardo AI</p>
        <p><strong>Model:</strong> Leonardo Vision XL (`ac614f96-1082-45bf-be9d-757f2d31c174`)</p>
        <p><strong>Resolution:</strong> 1024 x 1024 px</p>
        <p><strong>Type:</strong> Text-to-Image</p>
      </div>
    </div>
  );
}