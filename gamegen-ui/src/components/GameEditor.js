// gamegen-ui/src/components/GameEditor.js
import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const userSessionId = uuidv4();

// --- Centralized Game Configuration (Keep as is) ---
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
      { type: 'character', label: 'Main Character (Bird)', promptPlaceholder: 'e.g., a blue bird', defaultAssetPath: '/games/flappy-bird/assets/images/yellowbird-midflap.png' },
      { type: 'obstacle', label: 'Pipe Style', promptPlaceholder: 'e.g., grey pipes', defaultAssetPath: '/games/flappy-bird/assets/images/pipe.png' },
      { type: 'background', label: 'Background', promptPlaceholder: 'e.g., dark forest', defaultAssetPath: '/games/flappy-bird/assets/images/background.png' },
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
      { type: 'moleCharacter', label: 'Mole Character', promptPlaceholder: 'e.g., an alien mole, a skull', defaultAssetPath: '/games/Whack-A-Mole/css/mole.png' },
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
      { type: 'character', label: 'Main Character (Player)', promptPlaceholder: 'e.g., aeroplane', defaultAssetPath: '/games/speed-runner/assets/images/ships/ship3.png' },
      { type: 'obstacle', label: 'Obstacle Style', promptPlaceholder: 'e.g., blue boxes', defaultAssetPath: '' },
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
      { type: 'background', label: 'Background Image', promptPlaceholder: 'e.g., a sunny day', defaultAssetPath: '/games/simple-match-3/background.jpg' },
      { type: 'gemSet', label: 'Gem/Candy Style', promptPlaceholder: 'e.g.,cute pixel art fruits', defaultAssetPath: '' },
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
      { type: 'character', label: 'Main Character (Player)', promptPlaceholder: 'e.g., princess girl', defaultAssetPath: '/games/crossy-road/images/char-boy.png' },
      { type: 'obstacle', label: 'Obstacle (Car/Enemy)', promptPlaceholder: 'e.g., a spider', defaultAssetPath: '/games/crossy-road/images/enemy-bug.png' },
    ],
    difficultyPresets: {
      'simple': { obstacleSpeed: 1, trafficDensity: 0.8, playerMoveDelay: 150, gameDuration: 240 },
      'medium': { obstacleSpeed: 2, trafficDensity: 0.5, playerMoveDelay: 100, gameDuration: 180 },
      'hard': { obstacleSpeed: 3.5, trafficDensity: 0.2, playerMoveDelay: 75, gameDuration: 90 },
    },
    isLandscape: false,
  },
};

// --- Helper function to format frame numbers for different naming conventions (UNCHANGED) ---
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

  const [combinedAiPrompt, setCombinedAiPrompt] = useState('');
  const [isLoadingCombinedAi, setIsLoadingCombinedAi] = useState(false);

  const [loadingAsset, setLoadingAsset] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');

  const iframeRef = useRef(null);

  const postMessageToGame = useCallback((data) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(data, '*');
      console.log(`%c[GameEditor]: Posted message to ${config.title}:`, 'color: orange;', data);
    }
  }, [config.title]);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow && config && gameSettings && currentAssets) {
      // Send game parameters first
      Object.keys(gameSettings).forEach(key => {
        postMessageToGame({ type: 'UPDATE_PARAM', key: key, value: parseFloat(gameSettings[key]) });
      });

      // Then send asset updates
      Object.keys(currentAssets).forEach(typeFromCurrentAssets => {
        const assetValue = currentAssets[typeFromCurrentAssets];
        
        // --- MODIFIED: Handle gemSet as an array of URLs, other assets as single URLs ---
        if (typeFromCurrentAssets === 'gemSet' && assetValue && Array.isArray(assetValue.urls)) {
            // If it's gemSet and has a 'urls' array, send it in the 'data' property
            postMessageToGame({
                type: 'UPDATE_ASSET',
                assetType: typeFromCurrentAssets,
                data: { urls: assetValue.urls, isAnimated: false } // Pass the urls array
            });
            console.log(`%c[GameEditor]: Initial gemSet assets sent for ${typeFromCurrentAssets}.`, 'color: blue;', assetValue.urls);
        } else if (typeof assetValue === 'string') { // For single image assets (char, bg, obstacle, ground, moleCharacter)
            // If it's a direct Base64 string or a path, send it as 'url' and also in 'data.imageUrl'
            postMessageToGame({
                type: 'UPDATE_ASSET',
                assetType: typeFromCurrentAssets,
                url: assetValue, // Send the Base64 data URL or path directly
                data: { imageUrl: assetValue } // Also send in data.imageUrl for game consumption flexibility
            });
            console.log(`%c[GameEditor]: Initial single asset sent for ${typeFromCurrentAssets}.`, 'color: blue;', assetValue);
        } else if (typeof assetValue === 'object' && assetValue !== null && assetValue.isAnimated) {
            // This case is for animated sprites, if you ever add them.
            postMessageToGame({
                type: 'UPDATE_ASSET',
                assetType: typeFromCurrentAssets,
                data: assetValue // Send the animation config object
            });
            console.log(`%c[GameEditor]: Initial animated asset sent for ${typeFromCurrentAssets}.`, 'color: blue;', assetValue);
        } else {
            console.warn(`%c[GameEditor]: Skipping initial asset message for ${typeFromCurrentAssets}. Unexpected type or structure:`, 'color: orange;', assetValue);
        }
      });
    }
  }, [gameSettings, currentAssets, config, postMessageToGame]);


  const handleParameterChange = (key, value) => {
    const newSettings = { ...gameSettings, [key]: value };
    onGameSettingsChange(newSettings);
    postMessageToGame({ type: 'UPDATE_PARAM', key: key, value: parseFloat(value) });
  };

  const handleGenerateAsset = async (assetType, prompt) => {
    if (!prompt.trim()) return;
    setLoadingAsset(assetType);

    try {
      const response = await axios.post('http://localhost:5000/api/generate-asset', {
        prompt: prompt,
        assetType: assetType,
      });

      // --- MODIFIED: Destructure 'urls' in addition to 'image' ---
      const { success, image, urls, error } = response.data; // Now expect 'urls' for gemSet

      if (success) {
        if (assetType === 'gemSet' && urls && Array.isArray(urls)) {
            // For gemSet, 'urls' will be an array of Base64 strings from the backend
            console.log(`%c[GameEditor Debug]: Received ${urls.length} gem URLs from backend for ${assetType}.`, 'color: green;');
            // Store the full object { urls: [...] } in currentAssets (parent state)
            onAssetChange(gameId, assetType, { urls: urls, isAnimated: false }); // publicDataToStore is now an object

            // Post message to the game iframe with the 'urls' array inside 'data'
            postMessageToGame({
                type: 'UPDATE_ASSET',
                assetType: assetType,
                data: { urls: urls, isAnimated: false } // Send the array of URLs as 'data'
            });
            alert(`Success: Generated ${assetType} assets!`);
        } else if (image) {
            // For single images (character, background, obstacle, ground, moleCharacter)
            console.log(`%c[GameEditor Debug]: RAW BASE64 RECEIVED from backend for ${assetType}: ${image.substring(0, 100)}... (Length: ${image.length})`, 'color: green;');
            const generatedAssetDataUrl = `data:image/png;base64,${image}`;
            console.log(`%c[GameEditor Debug]: FULL DATA URL PREPARED for ${assetType}: ${generatedAssetDataUrl.substring(0, 100)}... (Length: ${generatedAssetDataUrl.length})`, 'color: green;');
            
            // Store the single Base64 URL in currentAssets (parent state)
            onAssetChange(gameId, assetType, generatedAssetDataUrl); // publicDataToStore is direct URL

            // Post message to the game iframe with the single URL
            postMessageToGame({
              type: 'UPDATE_ASSET',
              assetType: assetType,
              url: generatedAssetDataUrl, // Send as 'url' for simple cases
              data: { imageUrl: generatedAssetDataUrl } // Also send in data.imageUrl for game consumption flexibility
            });
            alert(`Success: Generated ${assetType} asset!`);
        } else {
            console.error(`%cGeneration failed for ${assetType}: Unexpected response data format.`, 'color: red;', response.data);
            alert(`Failed to generate ${assetType}: Unexpected data format.`);
        }
      } else {
        console.error(`%cGeneration failed for ${assetType}:`, 'color: red;', error);
        alert(`Failed to generate ${assetType}: ${error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('%cFailed to generate asset:', 'color: red;', error.response ? error.response.data : error.message);
      alert(`Failed to generate ${assetType}. Please check the console for details.`);
    } finally {
      setLoadingAsset(null);
    }
  };

  // --- handleGenerateCombinedAi: No functional changes needed here for gemSet handling ---
  // The logic within this function correctly calls handleGenerateAsset for each asset type,
  // and handleGenerateAsset now contains the specific logic for gemSet.
  const handleGenerateCombinedAi = async () => {
    if (!combinedAiPrompt.trim()) return;
    setIsLoadingCombinedAi(true);

    try {
      // Step 1: Call Backend LLM for prompt parsing
      console.log('%cCalling backend LLM to parse prompt:', 'color: lightblue;', combinedAiPrompt);
      const llmResponse = await axios.post('http://localhost:5000/api/generate-llm-text', {
        prompt: combinedAiPrompt,
        gameId: gameId // Pass gameId for LLM context
      });
      const { success: llmSuccess, data: llmParsedData, error: llmError } = llmResponse.data;

      if (!llmSuccess) {
        throw new Error(`LLM parsing failed: ${llmError || 'Unknown LLM error'}`);
      }
      const { character_prompt, background_prompt, difficulty, obstacle_prompt, gemset_prompt, other_settings } = llmParsedData; // Destructure all possible prompts

      console.log('%cLLM Parsed Data:', 'color: lightblue;', { character_prompt, background_prompt, difficulty, obstacle_prompt, gemset_prompt, other_settings });


      // Step 2: Apply Difficulty Presets (or directly from LLM's other_settings if available)
      let newGameSettings = { ...gameSettings }; // Start with current settings
      if (difficulty && config.difficultyPresets && config.difficultyPresets[difficulty]) {
        newGameSettings = { ...newGameSettings, ...config.difficultyPresets[difficulty] };
        setDifficulty(difficulty); // Update UI difficulty button
      } else if (other_settings && Object.keys(other_settings).length > 0) {
          // Future: if LLM returns explicit numbers for speed, duration, etc.
          newGameSettings = { ...newGameSettings, ...other_settings };
      }
      onGameSettingsChange(newGameSettings); // Update parent's state
      Object.keys(newGameSettings).forEach(key => { // Send to iframe
        postMessageToGame({ type: 'UPDATE_PARAM', key: key, value: parseFloat(newGameSettings[key]) });
      });


      // Step 3: Generate Assets based on parsed prompts (for current game's relevant assets)
      const assetGenerationPromises = [];

      // Iterate through the game's defined aiAssets to know what to generate
      config.aiAssets.forEach(assetConfig => {
        let promptToUse = '';
        let assetTypeKey = assetConfig.type; // e.g., 'character', 'background', 'moleCharacter', 'ground', 'gemSet'

        // --- IMPORTANT: Map LLM output keys to frontend assetConfig types based on gameId ---
        if (gameId === 'Whack-A-Mole') {
          if (assetTypeKey === 'moleCharacter') promptToUse = character_prompt;
          else if (assetTypeKey === 'ground') promptToUse = background_prompt;
        } else if (gameId === 'flappy-bird') {
          if (assetTypeKey === 'character') promptToUse = character_prompt;
          else if (assetTypeKey === 'background') promptToUse = background_prompt;
          else if (assetTypeKey === 'obstacle') promptToUse = obstacle_prompt;
        } else if (gameId === 'speed-runner') {
          if (assetTypeKey === 'character') promptToUse = character_prompt;
          else if (assetTypeKey === 'background') promptToUse = background_prompt;
          else if (assetTypeKey === 'obstacle') promptToUse = obstacle_prompt;
        } else if (gameId === 'simple-match-3') {
          if (assetTypeKey === 'background') promptToUse = background_prompt;
          else if (assetTypeKey === 'gemSet') promptToUse = gemset_prompt; // Correctly mapping to gemset_prompt
        } else if (gameId === 'crossy-road') {
          if (assetTypeKey === 'character') promptToUse = character_prompt;
          else if (assetTypeKey === 'obstacle') promptToUse = obstacle_prompt;
        }


        if (promptToUse && promptToUse.trim()) {
          assetGenerationPromises.push(handleGenerateAsset(assetTypeKey, promptToUse));
        }
      });

      await Promise.all(assetGenerationPromises);

      alert('Game assets and settings updated from combined prompt via AI!');

    } catch (error) {
      console.error('%cError processing combined AI prompt:', 'color: red;', error.response ? error.response.data : error.message);
      alert(`Failed to generate combined assets/settings: ${error.message || 'Please try again.'}`);
    } finally {
      setIsLoadingCombinedAi(false);
    }
  };


  const setDifficultyLevel = (level) => {
    setDifficulty(level);
    if (config.difficultyPresets && config.difficultyPresets[level]) {
      const newParams = config.difficultyPresets[level];
      onGameSettingsChange(newParams);
      Object.keys(newParams).forEach(key => {
        postMessageToGame({ type: 'UPDATE_PARAM', key: key, value: newParams[key] });
      });
      console.log(`%c[GameEditor]: Difficulty set to ${level}. Sent UPDATE_PARAM for each setting:`, 'color: green;', newParams);
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

  const handleExportGame = async () => {
    setIsExporting(true);
    console.log("%cInitiating game export...", 'color: yellow;');
    console.log("%cCurrent Game Parameters:", 'color: yellow;', gameSettings);
    console.log("%cCurrent AI Asset Server Paths for this game (from currentAssets state):", 'color: yellow;', currentAssets); // Use currentAssets

    try {
        const response = await axios.post(`http://localhost:5000/api/export/${gameId}`, {
            gameParameters: gameSettings,
            aiAssetPaths: currentAssets, // Correct: Use currentAssets which stores the Base64 URLs/objects
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

        console.log("%cGame exported successfully!", 'color: green;');
        alert("Your custom game has been downloaded!");
    } catch (error) {
        console.error('%cError during game export:', 'color: red;', error.response ? error.response.data : error.message);
        let errorMessage = 'Failed to export game. Please check the console for details.';
        if (error.response && error.response.data instanceof Blob) {
            try {
                const errorText = await error.response.data.text();
                const errorJson = JSON.parse(errorText);
                errorMessage += ` Server message: ${errorJson.message || errorText.substring(0, 100)}...`;
            } catch (parseError) {
                errorMessage += ` Server message: ${error.response.data.text().substring(0, 100)}...`;
            }
        } else if (error.response && error.response.data && typeof error.response.data.message === 'string') {
            errorMessage += ` Server message: ${error.response.data.message}`;
        } else if (error.response && error.response.status) {
            errorMessage += ` Server responded with status: ${error.response.status}`;
        }
        alert(errorMessage);
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
        {(loadingAsset || isExporting || isLoadingCombinedAi) && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-white text-xl font-semibold z-10">
            {isExporting ? 'Exporting...' : (isLoadingCombinedAi ? 'Generating All Assets & Settings...' : `Generating Image for ${loadingAsset}...`)}
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

        {/* NEW: Combined AI Prompt Input */}
        <div className="mb-8 p-4 bg-gray-700 rounded-md">
            <label htmlFor="combined-ai-prompt" className="block text-lg font-medium text-gray-300 mb-3">
                Generate with AI (Single Prompt):
            </label>
            <textarea
                id="combined-ai-prompt"
                value={combinedAiPrompt}
                onChange={(e) => setCombinedAiPrompt(e.target.value)}
                placeholder="e.g., game medium and a character skull at place of mole and a scary background"
                rows="3"
                className="block w-full flex-1 rounded-l-md border-gray-600 focus:ring-purple-500 focus:border-purple-500 text-base px-3 py-2 placeholder-gray-500 bg-gray-800 text-white mb-3"
            ></textarea>
            <button
                onClick={handleGenerateCombinedAi}
                disabled={isLoadingCombinedAi}
                className="w-full inline-flex items-center justify-center rounded-md border border-gray-600 bg-purple-600 px-4 py-2 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-purple-400 disabled:cursor-not-allowed transition duration-200 shadow"
            >
                {isLoadingCombinedAi ? 'Generating All...' : 'Generate Game with AI'}
            </button>
        </div>


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

        {/* AI Asset Generation Section (Individual Prompts) */}
        {/* Keep this section if you want users to generate individual assets too */}
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
                className="block w-full flex-1 rounded-l-md border-gray-600 focus:ring-purple-500 focus:border-purple-500 text-base px-3 py-2 placeholder-gray-500 bg-gray-800 text-white mb-3"
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
            {currentAssets[asset.type] && (
              <div className="mt-4 text-center">
                {/* Check if the asset is an object with 'urls' (e.g., from default config or older AI)
                    or if it's a direct Base64 string from new AI generation.
                    Prioritize Base64/single URL string for simplicity. */}
                {asset.type === 'gemSet' && currentAssets[asset.type].urls && currentAssets[asset.type].urls.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-2">
                        {currentAssets[asset.type].urls.map((url, index) => (
                            <img
                                key={index}
                                src={url}
                                alt={`${asset.label} ${index + 1}`}
                                className="max-w-[80px] max-h-[80px] object-contain border border-gray-600 rounded-md shadow"
                            />
                        ))}
                    </div>
                ) : (
                    <img
                        src={typeof currentAssets[asset.type] === 'string'
                            ? currentAssets[asset.type]
                            : (currentAssets[asset.type].url) || currentAssets[asset.type].defaultAssetPath
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
            disabled={isExporting || loadingAsset !== null || isLoadingCombinedAi}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition duration-200 shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Export as ZIP'}
          </button>
        </div>
      </div>
    </div>
  );
}