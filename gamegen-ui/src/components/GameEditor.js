// gamegen-ui/src/components/GameEditor.js
import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const userSessionId = uuidv4();

// --- Centralized Game Configuration ---
const gameConfigs = {
  'flappy-bird': {
    title: 'Flappy Bird',
    templatePath: '/games/flappy-bird/index.html',
    parameters: [
      { name: 'Gravity', key: 'gravity', min: 0.1, max: 1.0, step: 0.1, defaultValue: 0.4 },
      { name: 'Pipe Gap', key: 'pipeGap', min: 200, max: 500, step: 10, defaultValue: 400 },
      { name: 'Game Speed', key: 'speed', min: 1, max: 10, step: 0.5, defaultValue: 3 },
    ],
    aiAssets: [
      { type: 'character', label: 'Main Character (Bird)', promptPlaceholder: 'e.g., generate pink pixel robot with wings', defaultAssetPath: '/games/flappy-bird/assets/images/yellowbird-midflap.png' },
      { type: 'obstacle', label: 'Pipe Style', promptPlaceholder: 'e.g., rusty red pipes, futuristic blue tubes', defaultAssetPath: '/games/flappy-bird/assets/images/pipe.png' },
      { type: 'background', label: 'Background', promptPlaceholder: 'e.g., pixel art city skyline, spooky night forest', defaultAssetPath: '/games/flappy-bird/assets/images/background.png' },
    ],
    difficultyPresets: {
      'simple': { gravity: 0.3, speed: 2, pipeGap: 500 },
      'medium': { gravity: 0.4, speed: 3, pipeGap: 400 },
      'hard': { gravity: 0.5, speed: 4, pipeGap: 300 },
    },
    isLandscape: false,
  },
  'Whack-A-Mole': {
    title: 'Whack-A-Mole',
    templatePath: '/games/Whack-A-Mole/index.html',
    parameters: [
      { name: 'Mole Spawn Rate (ms)', key: 'moleSpawnRate', min: 500, max: 3000, step: 100, defaultValue: 1500 },
      { name: 'Game Duration (s)', key: 'gameDuration', min: 30, max: 120, step: 10, defaultValue: 60 },
    ],
    aiAssets: [
      // These entries are already present in your provided code.
      // We just need to ensure the prompt placeholders are good for the AI server.
      { type: 'moleCharacter', label: 'Mole Character', promptPlaceholder: 'e.g., an alien mole, a cute hamster, a skull', defaultAssetPath: '/games/Whack-A-Mole/css/mole.png' },
      { type: 'ground', label: 'Ground Texture', promptPlaceholder: 'e.g., muddy farm ground, grey stone, snowy landscape', defaultAssetPath: '/games/Whack-A-Mole/css/background.png' },
    ],
    difficultyPresets: {
      'simple': { moleSpawnRate: 2500, gameDuration: 90 },
      'medium': { moleSpawnRate: 1500, gameDuration: 60 },
      'hard': { moleSpawnRate: 700, gameDuration: 30 },
    },
    isLandscape: false,
  },
  'speed-runner': {
    title: 'Speed Runner',
    templatePath: '/games/speed-runner/index.html',
    parameters: [
      { name: 'Player Horizontal Speed', key: 'playerSpeedX', min: 1, max: 20, step: 1, defaultValue: 10 },
      { name: 'Obstacle Spawn Delay (ms)', key: 'obstacleSpawnDelay', min: 500, max: 3000, step: 100, defaultValue: 1500 },
    ],
    aiAssets: [
      { type: 'character', label: 'Main Character (Player)', promptPlaceholder: 'e.g., a futuristic space car', defaultAssetPath: '/games/speed-runner/assets/images/ships/ship3.png' },
      { type: 'obstacle', label: 'Obstacle Style', promptPlaceholder: 'e.g., spiky red barriers, floating green energy balls', defaultAssetPath: '' },
    ],
    difficultyPresets: {
      'simple': { playerSpeedX: 8, obstacleSpawnDelay: 2500 },
      'medium': { playerSpeedX: 10, obstacleSpawnDelay: 1500 },
      'hard': { playerSpeedX: 12, obstacleSpawnDelay: 800 },
    },
    isLandscape: true,
  },
  'simple-match-3': {
    title: 'Simple Match-3',
    templatePath: '/games/simple-match-3/index.html',
    parameters: [
      { name: 'Board Rows', key: 'rows', min: 7, max: 9, step: 1, defaultValue: 8 },
      { name: 'Board Columns', key: 'columns', min: 7, max: 9, step: 1, defaultValue: 8 },
      { name: 'Points Per Match', key: 'scorePerMatch', min: 10, max: 100, step: 10, defaultValue: 30 },
      { name: 'Game Duration (s)', key: 'gameDuration', min: 15, max: 120, step: 15, defaultValue: 60 },
    ],
    aiAssets: [
      { type: 'background', label: 'Background Image', promptPlaceholder: 'e.g., an enchanted forest, deep space nebula', defaultAssetPath: '/games/simple-match-3/background.jpg' },
      { type: 'gemSet', label: 'Gem/Candy Style', promptPlaceholder: 'e.g., shiny metallic gears, cute pixel art fruits', defaultAssetPath: '' },
    ],
    difficultyPresets: {
      'simple': { rows: 7, columns: 7, scorePerMatch: 20, gameDuration: 120 },
      'medium': { rows: 8, columns: 8, scorePerMatch: 30, gameDuration: 60 },
      'hard': { rows: 9, columns: 9, scorePerMatch: 50, gameDuration: 30 },
    },
    isLandscape: true,
  },
  'crossy-road': {
    title: 'Crossy Road',
    templatePath: '/games/crossy-road/index.html',
    parameters: [
      { name: 'Obstacle Speed', key: 'obstacleSpeed', min: 1, max: 5, step: 0.5, defaultValue: 2 },
      { name: 'Traffic Density Factor', key: 'trafficDensity', min: 0.1, max: 1.0, step: 0.1, defaultValue: 0.5 },
      { name: 'Player Movement Delay (ms)', key: 'playerMoveDelay', min: 50, max: 500, step: 50, defaultValue: 100 },
      { name: 'Game Duration (s)', key: 'gameDuration', min: 60, max: 300, step: 30, defaultValue: 180 },
    ],
    aiAssets: [
      { type: 'character', label: 'Main Character (Player)', promptPlaceholder: 'e.g., a jumping pixel frog, a tiny medieval knight', defaultAssetPath: '/games/crossy-road/images/char-boy.png' },
      { type: 'obstacle', label: 'Obstacle (Car/Enemy)', promptPlaceholder: 'e.g., a retro arcade car, a giant rolling beetle', defaultAssetPath: '/games/crossy-road/images/enemy-bug.png' },
    ],
    difficultyPresets: {
      'simple': { obstacleSpeed: 1, trafficDensity: 0.8, playerMoveDelay: 150, gameDuration: 240 },
      'medium': { obstacleSpeed: 2, trafficDensity: 0.5, playerMoveDelay: 100, gameDuration: 180 },
      'hard': { obstacleSpeed: 3.5, trafficDensity: 0.2, playerMoveDelay: 75, gameDuration: 90 },
    },
    isLandscape: false,
  },
};

// --- Helper function to format frame numbers for different naming conventions ---
const getFrameFilename = (prefix, frameIndex) => {
    if (prefix.includes('skeleton-animation_')) {
        return `${prefix}${String(frameIndex).padStart(2, '0')}.png`;
    }
    if (prefix.includes('man')) {
        return `${prefix}${String(frameIndex).padStart(3, '0')}.png`;
    }
    if (prefix.includes('frame-')) {
        return `${prefix}${frameIndex + 1}.png`;
    }
    return `${prefix}${frameIndex}.png`;
};


// --- GameEditor Component ---
export default function GameEditor({
  game,
  onBackToHome,
  gameSettings,
  onGameSettingsChange,
  currentAssets,
  onAssetChange,
  aiAssetServerPaths
}) {
  const gameId = game.id;
  const config = gameConfigs[gameId];

  const [aiPromptInput, setAiPromptInput] = useState(() => {
    const initialPromptValues = {};
    if (config && config.aiAssets) {
        config.aiAssets.forEach(asset => {
            initialPromptValues[asset.type] = '';
        });
    }
    return initialPromptValues;
  });
  const [loadingAsset, setLoadingAsset] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');

  const iframeRef = useRef(null);

  const postMessageToGame = useCallback((data) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(data, '*'); // Send 'data' directly
      console.log(`[GameEditor]: Posted message to ${config.title}:`, data);
    }
  }, [config.title]);

  // This useEffect handles initial load and updates from App.js's gameSettings/currentAssets
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow && config && gameSettings && currentAssets) {
      // Send game settings as individual UPDATE_PARAM messages
      Object.keys(gameSettings).forEach(key => {
        postMessageToGame({ type: 'UPDATE_PARAM', key: key, value: gameSettings[key] });
      });

      // Send asset updates with correct structure
      Object.keys(currentAssets).forEach(typeFromCurrentAssets => {
        const assetValue = currentAssets[typeFromCurrentAssets];
        let payloadForGame = null;

        if (typeof assetValue === 'string') {
            payloadForGame = assetValue; // It's a URL string
        } else if (typeof assetValue === 'object' && assetValue !== null) {
            payloadForGame = assetValue; // It's an object (animationData or {urls: []})
        }

        if (payloadForGame) {
            postMessageToGame({
                type: 'UPDATE_ASSET',
                assetType: typeFromCurrentAssets,
                // --- MODIFIED: Send 'data' property if it's an object, otherwise 'url' ---
                // This ensures animated assets send their full data, and static assets send their URL.
                data: typeof payloadForGame === 'object' ? payloadForGame : undefined,
                url: typeof payloadForGame === 'string' ? payloadForGame : undefined
            });
        }
      });
    }
  }, [gameSettings, currentAssets, config, postMessageToGame]);


  const handleParameterChange = (key, value) => {
    const newSettings = { ...gameSettings, [key]: value };
    onGameSettingsChange(newSettings); // Update parent's state
    // Send individual UPDATE_PARAM message for immediate feedback
    postMessageToGame({ type: 'UPDATE_PARAM', key: key, value: parseFloat(value) });
  };

  const handleGenerateAsset = async (assetType, prompt) => {
    if (!prompt.trim()) return;
    setLoadingAsset(assetType);

    try {
      const aiResponse = await axios.post('/api/generate-image', {
          gameTemplate: gameId,
          assetType: assetType,
          prompt: prompt,
          userSessionId: userSessionId,
      });

      const { success, imageUrl, animationData, message, serverFilePath, urls } = aiResponse.data;

      if (success) {
          let publicDataToStore = null;
          let serverPathToStore = null;
          let payloadForGame = null; // This will hold the object/string to send to the game iframe

          if (animationData) {
              publicDataToStore = animationData; // Store the full animationData object
              if (imageUrl) {
                  publicDataToStore.imageUrl = imageUrl; // Add imageUrl to animationData for preview
              }
              serverPathToStore = animationData.prefix || serverFilePath;
              payloadForGame = publicDataToStore; // Send the full animationData object
          } else if (urls && Array.isArray(urls)) { 
              publicDataToStore = { urls: urls, isAnimated: false }; // Store as an object with 'urls' array
              serverPathToStore = serverFilePath || urls[0]; // Use first URL for server path tracking
              payloadForGame = publicDataToStore; // Send the object with urls array
          } else if (imageUrl) {
              publicDataToStore = imageUrl; // Store the direct URL for static assets
              serverPathToStore = serverFilePath || imageUrl;
              payloadForGame = imageUrl; // Send the single URL string
          } else {
              throw new Error("AI generation endpoint did not return valid image or animation data.");
          }

          onAssetChange(gameId, assetType, publicDataToStore, serverPathToStore);
          console.log(`Success: ${message}`);

          if (payloadForGame) {
              postMessageToGame({
                  type: 'UPDATE_ASSET',
                  assetType: assetType,
                  // --- MODIFIED: Send 'data' property if it's an object, otherwise 'url' ---
                  // This ensures animated assets send their full data, and static assets send their URL.
                  data: typeof payloadForGame === 'object' ? payloadForGame : undefined,
                  url: typeof payloadForGame === 'string' ? payloadForGame : undefined
              });
          }
      } else {
          console.log(`Generation failed: ${message}`);
      }
    } catch (error) {
      console.error('Failed to generate asset:', error.response ? error.response.data : error.message);
      console.log('Failed to generate asset. Please check the console for details.');
    } finally {
      setLoadingAsset(null);
    }
  };

  const setDifficultyLevel = (level) => {
    setDifficulty(level); // Updates the active difficulty button UI
    if (config.difficultyPresets && config.difficultyPresets[level]) {
      const newParams = config.difficultyPresets[level];
      
      // 1. Update the parent's (App.js) gameSettings state
      onGameSettingsChange(newParams); 

      // 2. IMMEDIATELY post individual messages to the game iframe
      // Iterate and send individual UPDATE_PARAM messages
      Object.keys(newParams).forEach(key => {
        postMessageToGame({ type: 'UPDATE_PARAM', key: key, value: newParams[key] });
      });

      console.log(`[GameEditor]: Difficulty set to ${level}. Sent UPDATE_PARAM for each setting:`, newParams);
    }
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center flex-col">
        <p className="text-2xl mb-4">Error: Game configuration not found for "{game.name}".</p>
        <button onClick={onBackToHome} className="ml-4 px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors duration-200">
          ← Back to Templates
        </button>
      </div>
    );
  }

  // Handle Export Game
  const handleExportGame = async () => {
      setIsExporting(true);
      console.log("Initiating game export...");
      console.log("Current Game Parameters:", gameSettings);
      console.log("Current AI Asset Server Paths for this game:", aiAssetServerPaths);

      try {
          const response = await axios.post(`http://localhost:5000/api/export/${gameId}`, {
              gameParameters: gameSettings,
              aiAssetPaths: aiAssetServerPaths,
              userSessionId: userSessionId,
          }, {
              responseType: 'blob',
          });

          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${gameId}_custom_game.zip`);
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
          window.URL.revokeObjectURL(url);

          console.log("Game exported successfully!");
          console.log("Your custom game has been downloaded!");

      } catch (error) {
          console.error('Error during game export:', error.response ? error.response.data : error.message);
          let errorMessage = 'Failed to export game. Please check the console for details.';
          if (error.response && error.response.data instanceof Blob) {
              const errorText = await error.response.data.text();
              console.error('Backend error message:', errorText);
              errorMessage += ` Server message: ${errorText.substring(0, 100)}...`;
          } else if (error.response && error.response.data && typeof error.response.data.message === 'string') {
              errorMessage += ` Server message: ${error.response.data.message}`;
          } else if (error.response && error.response.status) {
              errorMessage += ` Server responded with status: ${error.response.status}`;
          }
          console.log(errorMessage);
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <div className={`flex w-full h-screen bg-gray-900 text-white p-8 ${config.isLandscape ? 'flex-col lg:flex-row' : ''}`}>
      {/* GAME IFRAME SECTION: Displays the game preview */}
      <div className={`
          ${config.isLandscape ? 'flex-grow w-full lg:w-3/4 mb-4 lg:mb-0 lg:mr-8' : 'flex-1 mr-8'}
          relative overflow-hidden rounded-sm shadow-md border-2 border-black bg-white
      `}>
        <iframe
          ref={iframeRef}
          src={config.templatePath}
          title={config.title}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
        ></iframe>
        {/* Loading overlay for AI generation or export */}
        {(loadingAsset || isExporting) && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-white text-xl font-semibold z-10">
            {isExporting ? 'Exporting Game...' : `Generating Image for ${loadingAsset}...`}
          </div>
        )}
      </div>

      {/* CONTROLS SECTION: Contains all game customization options */}
      <div className={`
          ${config.isLandscape ? 'flex-shrink-0 w-full lg:w-1/4' : 'w-1/3'}
          flex flex-col p-6 bg-gray-800 rounded-lg shadow-xl overflow-y-auto border border-gray-700
      `}>
        <button
          onClick={onBackToHome}
          className="mb-6 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors duration-200"
        >
          ← Back to Templates
        </button>

        <p className="text-xl font-semibold mb-6 text-gray-300">Change as per your choice ({config.title})</p>

        {/* Difficulty Level Buttons */}
        <div className="mb-8">
          <label className="block text-lg font-medium text-gray-300 mb-3">Level:</label>
          <div className="flex space-x-3">
            <button
              onClick={() => setDifficultyLevel('simple')}
              className={`px-5 py-2 rounded-md font-semibold transition duration-200 ${
                difficulty === 'simple' ? 'bg-purple-600 text-white shadow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => setDifficultyLevel('medium')}
              className={`px-5 py-2 rounded-md font-semibold transition duration-200 ${
                difficulty === 'medium' ? 'bg-purple-600 text-white shadow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Medium
            </button>
            <button
              onClick={() => setDifficultyLevel('hard')}
              className={`px-5 py-2 rounded-md font-semibold transition duration-200 ${
                difficulty === 'hard' ? 'bg-purple-600 text-white shadow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Hard
            </button>
          </div>
        </div>

        {/* Parameter Sliders */}
        <div className="space-y-6 mb-8">
          {config.parameters.map(param => (
            <div key={param.key}>
              <label htmlFor={param.key} className="block text-base font-medium text-gray-300 mb-2">
                {param.name}: <span className="text-purple-400 font-bold">
                    {gameSettings[param.key] !== undefined ? gameSettings[param.key] : param.defaultValue}
                </span>
              </label>
              <input
                type="range"
                id={param.key}
                min={param.min}
                max={param.max}
                step={param.step}
                value={gameSettings[param.key] !== undefined ? gameSettings[param.key] : param.defaultValue}
                onChange={(e) => handleParameterChange(param.key, parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>
          ))}
        </div>

        {/* AI Asset Generation Section */}
        {config.aiAssets.map(asset => (
          <div key={asset.type} className="flex flex-col mb-8 border-t border-gray-700 pt-6">
            <label htmlFor={`prompt-${asset.type}`} className="block text-base font-medium text-gray-300 mb-2">
              {asset.label} Change:
            </label>
            <div className="flex items-center rounded-md shadow-sm overflow-hidden">
              <input
                type="text"
                id={`prompt-${asset.type}`}
                value={aiPromptInput[asset.type] || ''}
                onChange={(e) => setAiPromptInput(prev => ({ ...prev, [asset.type]: e.target.value }))}
                className="block w-full flex-1 rounded-l-md border-gray-600 focus:ring-purple-500 focus:border-purple-500 text-base px-3 py-2 placeholder-gray-500 bg-gray-700 text-white"
                placeholder={asset.promptPlaceholder}
              />
              <button
                onClick={() => handleGenerateAsset(asset.type, aiPromptInput[asset.type])}
                disabled={loadingAsset === asset.type}
                className="inline-flex items-center justify-center rounded-r-md border border-gray-600 bg-purple-600 px-4 py-2 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-purple-400 disabled:cursor-not-allowed transition duration-200 shadow"
              >
                {loadingAsset === asset.type ? 'Generating...' : 'Generate'}
              </button>
            </div>
            {/* Asset Preview Display */}
            {currentAssets[asset.type] && ( // Check if an asset is actually available to display
              <div className="mt-4 text-center">
                {currentAssets[asset.type].isAnimated ? (
                  <img
                    src={getFrameFilename(currentAssets[asset.type].prefix, 0)}
                    alt={asset.label}
                    className="mx-auto max-w-[120px] max-h-[120px] object-contain border border-gray-600 rounded-md shadow"
                    style={{
                      width: currentAssets[asset.type].frameWidth || 'auto',
                      height: currentAssets[asset.type].frameHeight || 'auto'
                    }}
                  />
                ) : (
                  <img
                    // Prioritize urls[0] for preview if available
                    src={
                        (currentAssets[asset.type].urls && currentAssets[asset.type].urls[0]) || 
                        currentAssets[asset.type].url || 
                        currentAssets[asset.type]
                    }
                    alt={asset.label}
                    className="mx-auto max-w-[120px] max-h-[120px] object-contain border border-gray-600 rounded-md shadow"
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Export Button Section */}
        <div className="mt-auto pt-6 border-t border-gray-700">
          <button
            onClick={handleExportGame}
            disabled={isExporting || loadingAsset !== null}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition duration-200 shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Export as ZIP'}
          </button>
        </div>
      </div>
    </div>
  );
}
