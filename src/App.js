import React, { useState, useEffect } from 'react';

// Import the new components for our desired flow
import SplashScreen from './components/SplashScreen';
import HomePage from './components/HomePage';
import GameEditor from './components/GameEditor';

function App() {
  // State to manage which screen is currently displayed
  // Can be 'splash', 'home', or 'editor'
  const [currentScreen, setCurrentScreen] = useState('splash');

  // State to store the details of the game template selected by the user
  const [selectedGame, setSelectedGame] = useState(null);

  // useEffect hook to manage the splash screen display
  useEffect(() => {
    // Set a timer to switch from the 'splash' screen to the 'home' screen after 3 seconds
    const timer = setTimeout(() => {
      setCurrentScreen('home');
    }, 3000); // 3000 milliseconds = 3 seconds

    // Cleanup function to clear the timer if the component unmounts prematurely
    return () => clearTimeout(timer);
  }, []); // The empty dependency array ensures this effect runs only once after the initial render

  // Function to handle game selection from the HomePage
  const handleSelectGame = (game) => {
    setSelectedGame(game); // Store the selected game's data
    setCurrentScreen('editor'); // Switch the screen to the GameEditor
  };

  // Function to handle navigation back to the home page from the editor
  const handleBackToHome = () => {
    setSelectedGame(null); // Clear the selected game
    setCurrentScreen('home'); // Switch back to the HomePage
  };

  // A helper function to conditionally render the correct screen component
  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen />; // Render the splash screen
      case 'home':
        // Render the home page, passing the handleSelectGame function
        return <HomePage onSelectGame={handleSelectGame} />;
      case 'editor':
        // Render the game editor, passing the selected game data and a function to go back
        return <GameEditor game={selectedGame} onBackToHome={handleBackToHome} />;
      default:
        // Fallback to home page if currentScreen state is unexpected
        return <HomePage onSelectGame={handleSelectGame} />;
    }
  };

  return (
    // The main container for the entire application.
    // It sets a minimum height of the screen and a dark background for consistency.
        <div className="min-h-screen bg-gray-900 text-white">
      {renderScreen()} {/* Call the helper function to render the current screen */}
    </div>
  );
}

export default App;