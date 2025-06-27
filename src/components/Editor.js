// src/components/Editor.js
import { useState, useRef, useEffect } from 'react';
import GamePreview from './GamePreview';
import axios from 'axios'; // We need axios to make API calls from the frontend

export default function Editor() {
  // --- States for Sliders ---
  const [gravity, setGravity] = useState(0.4);
  const [speed, setSpeed] = useState(3);
  const [pipeGap, setPipeGap] = useState(400);

  // --- States for AI Image Generation ---
  const [prompt, setPrompt] = useState('a small blue robot with wings'); // Default prompt
  const [isGenerating, setIsGenerating] = useState(false); // Loading state

  const iframeRef = useRef(null);

  // --- Effect for sending slider settings to the game ---
  useEffect(() => {
    if (iframeRef.current) {
      const message = { type: 'UPDATE_SETTINGS', payload: { gravity, speed, pipeGap } };
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, [gravity, speed, pipeGap]);

  // --- Function to call our backend and generate an AI image ---
  const handleGenerateImage = async () => {
    if (!prompt) return; // Don't run if the prompt is empty
    setIsGenerating(true); // Start the loading animation on the button

    try {
      // Call our OWN backend API route that we created
      const response = await axios.post('/api/generate-image', { prompt });
      const { imageUrl } = response.data;

      // Send the new image URL to the game iframe
      if (iframeRef.current) {
        const message = { type: 'UPDATE_BIRD_IMAGE', payload: imageUrl };
        iframeRef.current.contentWindow.postMessage(message, '*');
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image. Please check the console for details.');
    } finally {
      setIsGenerating(false); // Stop the loading animation
    }
  };

  return (
    <div className="p-4 flex-grow">
      <h2 className="text-lg font-semibold text-gray-700 mb-2">2. Customize Your Game</h2>
      <div className="grid grid-cols-2 gap-8">
        
        <div className="h-96">
          <GamePreview ref={iframeRef} />
        </div>

        <div>
          {/* --- Game Parameters Section (Sliders) --- */}
          <h3 className="font-semibold text-gray-600 mb-2">Game Parameters</h3>
          <div className="space-y-4">
            <div><label htmlFor="gravity" className="block text-sm font-medium text-gray-700">Gravity: {gravity}</label><input type="range" id="gravity" min="0.1" max="1" step="0.1" value={gravity} onChange={(e) => setGravity(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/></div>
            <div><label htmlFor="speed" className="block text-sm font-medium text-gray-700">Game Speed: {speed}</label><input type="range" id="speed" min="1" max="10" step="0.5" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/></div>
            <div><label htmlFor="pipeGap" className="block text-sm font-medium text-gray-700">Pipe Gap: {pipeGap}</label><input type="range" id="pipeGap" min="200" max="500" step="10" value={pipeGap} onChange={(e) => setPipeGap(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/></div>
          </div>

          {/* --- NEW: Assets Section with AI --- */}
          <h3 className="font-semibold text-gray-600 mt-6 mb-2">Character Asset</h3>
          <div>
            <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-700">
              Describe your character (AI):
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input 
                type="text"
                id="ai-prompt" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="block w-full flex-1 rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3"
                placeholder="a happy little cloud"
              />
              <button
                onClick={handleGenerateImage}
                disabled={isGenerating} // Button is disabled while loading
                className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}