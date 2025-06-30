// src/components/GameEditor.js
import { useState, useRef, useEffect } from 'react';
import GamePreview from './GamePreview';
import axios from 'axios';

export default function GameEditor() { 
  // --- States for Sliders ---
  const [gravity, setGravity] = useState(0.4);
  const [speed, setSpeed] = useState(3);
  const [pipeGap, setPipeGap] = useState(400);

  // --- States for AI Image Generation ---
  const [birdImage, setBirdImage] = useState('/games/flappy-bird/assets/images/yellowbird-midflap.png'); 
  const [prompt, setPrompt] = useState('pixel art, small flying bird, side view, in motion'); 
  const [isGenerating, setIsGenerating] = useState(false); // Loading state

  // --- State for Difficulty Level ---
  const [difficulty, setDifficulty] = useState('medium'); // Default difficulty

  const iframeRef = useRef(null);

  // --- Effect to map Difficulty to Game Parameters ---
  useEffect(() => {
    if (difficulty === 'simple') {
      setGravity(0.3); // Easier gravity (less pull)
      setSpeed(2);    // Slower game speed
      setPipeGap(500);  // Larger pipe gap
    } else if (difficulty === 'medium') {
      setGravity(0.4);
      setSpeed(3);
      setPipeGap(400);
    } else if (difficulty === 'hard') {
      setGravity(0.5);  // Harder gravity (more pull)
      setSpeed(4);    // Faster game speed
      setPipeGap(300);  // Smaller pipe gap
    }
  }, [difficulty]); 

  // --- Effect to send settings AND the current birdImage to the game ---
  useEffect(() => {
    if (iframeRef.current) {
      // Send settings
      const settingsMessage = { type: 'UPDATE_SETTINGS', payload: { gravity, speed, pipeGap } };
      iframeRef.current.contentWindow.postMessage(settingsMessage, '*');

      // Send the current bird image (default or AI-generated)
      const birdImageMessage = { type: 'UPDATE_BIRD_IMAGE', payload: birdImage }; 
      iframeRef.current.contentWindow.postMessage(birdImageMessage, '*');
    }
  }, [gravity, speed, pipeGap, birdImage]); 

  // --- Function to call our backend and generate an AI image ---
  const handleGenerateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);

    try {
      const response = await axios.post('/api/generate-image', { prompt });
      const { imageUrl } = response.data;
      setBirdImage(imageUrl); 
      
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image. Please check the console for details, and remember the model might need to warm up.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    // Main container: full screen height, flex row for left/right panels, light theme
    <div className="flex w-full h-screen bg-gray-50 text-gray-800 p-8"> 
      
      {/* Left Panel: Whole Game View */}
      {/* CHANGES HERE: removed bg-black, updated border to border-2 border-black, rounded-sm for 2px radius */}
      <div className="flex-1 mr-8 relative overflow-hidden rounded-sm shadow-md border-2 border-black bg-white"> 
        <GamePreview ref={iframeRef} className="w-full h-full" />
        {isGenerating && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-white text-xl font-semibold z-10">
            Generating Image...
          </div>
        )}
      </div>

      {/* Right Panel: Customization Options */}
      <div className="w-1/3 flex flex-col p-6 bg-white rounded-lg shadow-xl overflow-y-auto border border-gray-200">
        
        {/* Top Text as per sketch */}
        <p className="text-xl font-semibold mb-6 text-gray-700">Change as per your choice</p>

        {/* Difficulty Level (AI Parameter Suggestion) */}
        <div className="mb-8">
          <label className="block text-lg font-medium text-gray-700 mb-3">Level:</label>
          <div className="flex space-x-3">
            <button
              onClick={() => setDifficulty('simple')}
              className={`px-5 py-2 rounded-md font-semibold transition duration-200 ${
                difficulty === 'simple' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => setDifficulty('medium')}
              className={`px-5 py-2 rounded-md font-semibold transition duration-200 ${
                difficulty === 'medium' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Medium
            </button>
            <button
              onClick={() => setDifficulty('hard')}
              className={`px-5 py-2 rounded-md font-semibold transition duration-200 ${
                difficulty === 'hard' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Hard
            </button>
          </div>
        </div>

        {/* Sliders (Game Parameters) */}
        <div className="space-y-6 mb-8">
          <div>
            <label htmlFor="gravity" className="block text-base font-medium text-gray-700 mb-2">Gravity: {gravity}</label>
            <input type="range" id="gravity" min="0.1" max="1" step="0.1" value={gravity} onChange={(e) => setGravity(parseFloat(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"/> 
          </div>
          <div>
            <label htmlFor="pipeGap" className="block text-base font-medium text-gray-700 mb-2">Pipe Gap: {pipeGap}</label>
            <input type="range" id="pipeGap" min="200" max="500" step="10" value={pipeGap} onChange={(e) => setPipeGap(parseInt(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
          </div>
          <div>
            <label htmlFor="speed" className="block text-base font-medium text-gray-700 mb-2">Game Speed: {speed}</label>
            <input type="range" id="speed" min="1" max="10" step="0.5" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
          </div>
        </div>

        {/* Main Character Change (Reskin) */}
        <div className="flex flex-col mb-8">
          <label htmlFor="main-character-prompt" className="block text-base font-medium text-gray-700 mb-2">Main Character (Bird) Change:</label>
          <div className="flex items-center rounded-md shadow-sm overflow-hidden">
            <input
              type="text"
              id="main-character-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="block w-full flex-1 rounded-l-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-base px-3 py-2 placeholder-gray-500" 
              placeholder="e.g., a blue cute robot with wings" 
            />
            <button
              onClick={handleGenerateImage}
              disabled={isGenerating}
              className="inline-flex items-center justify-center rounded-r-md border border-gray-300 bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition duration-200 shadow"
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>

        {/* Export Button - moved to bottom of right panel */}
        <div className="mt-auto pt-6 border-t border-gray-200">
          <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition duration-200 shadow-lg">
            Export as ZIP
          </button>
        </div>
      </div>
    </div>
  );
}