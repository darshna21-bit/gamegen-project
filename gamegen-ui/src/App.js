// gamegen-ui/src/App.js
import React, { useState, useEffect } from 'react';

import SplashScreen from './components/SplashScreen';
import HomePage from './components/HomePage';
import GameEditor from './components/GameEditor';

// IMPORTANT: GameConfigs should ideally be defined in a shared file (e.g., `src/gameConfigs.js`)
// and imported into both App.js and GameEditor.js to ensure consistency.
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
      { type: 'moleCharacter', label: 'Mole Character', promptPlaceholder: 'e.g., a fluffy purple monster mole', defaultAssetPath: '/games/Whack-A-Mole/assets/mole.png' },
      { type: 'hammer', label: 'Hammer/Mallet', promptPlaceholder: 'e.g., a golden cartoon hammer', defaultAssetPath: '/games/Whack-A-Mole/assets/hammer.png' },
      { type: 'ground', label: 'Ground Texture', promptPlaceholder: 'e.g., muddy farm ground with flowers', defaultAssetPath: '/games/Whack-A-Mole/assets/ground.png' },
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
      { type: 'character', label: 'Main Character (Player)', promptPlaceholder: 'e.g., a futuristic space car', defaultAssetPath: '/games/speed-runner/assets/player.png' },
      { type: 'background', label: 'Background Texture', promptPlaceholder: 'e.g., a starry galaxy background', defaultAssetPath: '/games/speed-runner/assets/background.png' },
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
      { name: 'Board Rows', key: 'rows', min: 7, max:9, step: 1, defaultValue: 8 },
      { name: 'Board Columns', key: 'columns', min: 7, max: 9, step: 1, defaultValue: 8 },
      // REMOVED: { name: 'Game Speed (ms)', key: 'gameSpeedMs', min: 50, max: 500, step: 10, defaultValue: 100 },
      { name: 'Points Per Match', key: 'scorePerMatch', min: 10, max: 100, step: 10, defaultValue: 30 },
      { name: 'Game Duration (s)', key: 'gameDuration', min: 15, max: 120, step: 15, defaultValue: 60 },
    ],
    aiAssets: [
      { type: 'background', label: 'Background Image', promptPlaceholder: 'e.g., an enchanted forest, deep space nebula', defaultAssetPath: '/games/simple-match-3/background.jpg' },
      { type: 'gemSet', label: 'Gem/Candy Style', promptPlaceholder: 'e.g., shiny metallic gears, cute pixel art fruits', defaultAssetPath: '' },
    ],
    difficultyPresets: {
      'simple': { rows: 7, columns: 7, scorePerMatch: 20, gameDuration: 120 }, // REMOVED gameSpeedMs
      'medium': { rows: 8, columns: 8, scorePerMatch: 30, gameDuration: 60 },  // REMOVED gameSpeedMs
      'hard': { rows: 9, columns: 9, scorePerMatch: 50, gameDuration: 30 }, // REMOVED gameSpeedMs
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
      { type: 'roadTexture', label: 'Road Texture', promptPlaceholder: 'e.g., a snowy road, a lava river texture', defaultAssetPath: '/games/crossy-road/images/road.png' },
    ],
    difficultyPresets: {
      'simple': { obstacleSpeed: 1, trafficDensity: 0.8, playerMoveDelay: 150, gameDuration: 240 },
      'medium': { obstacleSpeed: 2, trafficDensity: 0.5, playerMoveDelay: 100, gameDuration: 180 },
      'hard': { obstacleSpeed: 3.5, trafficDensity: 0.2, playerMoveDelay: 75, gameDuration: 90 },
    },
    isLandscape: false,
  },
};


function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [selectedGame, setSelectedGame] = useState(null);

  const [gameSettings, setGameSettings] = useState({});
  const [currentAssets, setCurrentAssets] = useState({});
  const [aiAssetServerPaths, setAiAssetServerPaths] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentScreen('home');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectGame = (game) => {
    setSelectedGame(game);
    setCurrentScreen('editor');

    const selectedGameConfig = gameConfigs[game.id];

    // Initialize gameSettings based on 'medium' difficulty preset if available,
    // otherwise fall back to default parameters.
    // START CHANGES HERE
    if (selectedGameConfig) {
      let initialParams = {};
      if (selectedGameConfig.difficultyPresets && selectedGameConfig.difficultyPresets['medium']) {
        // Use the 'medium' preset as the initial settings
        initialParams = { ...selectedGameConfig.difficultyPresets['medium'] };
      } else if (selectedGameConfig.parameters) {
        // Fallback to default values if 'medium' preset is not defined or difficultyPresets is missing
        selectedGameConfig.parameters.forEach(param => {
          initialParams[param.key] = param.defaultValue;
        });
      }
      setGameSettings(initialParams);
    } else {
      setGameSettings({});
    }
    // END CHANGES HERE

    // Initialize currentAssets and aiAssetServerPaths immediately for the selected game
    if (selectedGameConfig && selectedGameConfig.aiAssets) {
        const initialAssetsForGame = {};
        const initialServerPathsForGame = {};

        selectedGameConfig.aiAssets.forEach(asset => {
            // For default assets, publicUrl and serverFilePath are the same initially.
            // If defaultAssetPath needs to be an animationData object, you'd define it as such in gameConfigs
            // For now, assume defaultAssetPath is a string URL.
            initialAssetsForGame[asset.type] = asset.defaultAssetPath;
            initialServerPathsForGame[asset.type] = asset.defaultAssetPath;
        });

        // Set the state directly with the assets for THIS game
        setCurrentAssets(initialAssetsForGame);
        setAiAssetServerPaths(initialServerPathsForGame);
    } else {
        setCurrentAssets({});
        setAiAssetServerPaths({});
    }
  };

  const handleBackToHome = () => {
    setSelectedGame(null);
    setCurrentScreen('home');
    setGameSettings({});
    setCurrentAssets({});
    setAiAssetServerPaths({});
  };

  const handleGameSettingsChange = (newSettings) => {
    setGameSettings(newSettings);
  };

  // Callback to update currentAssets and aiAssetServerPaths for the current game
  const handleAssetChange = (gameId, assetType, publicUrlOrAnimationData, serverFilePath) => {
    // We no longer need gameId here as currentAssets and aiAssetServerPaths already hold
    // the assets for the currently selected game directly.
    setCurrentAssets(prev => ({
      ...prev,
      [assetType]: publicUrlOrAnimationData // Store the public URL or animationData object
    }));
    setAiAssetServerPaths(prev => ({
      ...prev,
      [assetType]: serverFilePath // Store the server-side path
    }));
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen />;
      case 'home':
        return <HomePage onSelectGame={handleSelectGame} />;
      case 'editor':
        return (
          <GameEditor
            game={selectedGame}
            onBackToHome={handleBackToHome}
            gameSettings={gameSettings}
            onGameSettingsChange={handleGameSettingsChange}
            currentAssets={currentAssets} // Pass currentAssets directly
            onAssetChange={handleAssetChange}
            aiAssetServerPaths={aiAssetServerPaths} // Pass current server paths directly
          />
        );
      default:
        return <HomePage onSelectGame={handleSelectGame} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {renderScreen()}
    </div>
  );
}

export default App;
