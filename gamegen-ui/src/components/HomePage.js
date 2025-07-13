import React, { useState } from 'react';
import GameTemplateCard from './GameTemplateCard'; // This imports the next component

// Define your game templates here. These are the ones shown on the homepage.
const gameTemplates = [
  { id: 'flappy-bird', name: 'Flappy Bird', description: 'Help the bird fly through pipes!', thumbnail: 'flappy-bird-thumb.png' },
  { id: 'speed-runner', name: 'Speed Runner', description: 'Run and jump to avoid obstacles.', thumbnail: 'speed-runner-thumb.png' },
  { id: 'Whack-A-Mole', name: 'Whack-A-Mole', description: 'Test your reflexes, whack the moles!', thumbnail: 'whack-mole-thumb.png' },
  { id: 'simple-match-3', name: 'Simple Match-3', description: 'Match colorful gems to clear the board.', thumbnail: 'match3-thumb.png' },
  { id: 'crossy-road', name: 'Crossy Road', description: 'Cross the road, avoid traffic and rivers!', thumbnail: 'crossy-road-thumb.png' },
];

const HomePage = ({ onSelectGame }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter games based on search term
  const filteredGames = gameTemplates.filter(game =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold font-alagard text-center mb-10">Choose Your Game Template</h2>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <input
            type="text"
            placeholder="Search Templates..."
            className="w-full p-4 rounded-xl border border-gray-700 bg-gray-800 text-white placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Search icon */}
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>

        {/* Game Template List (Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGames.map((game, index) => (
            <GameTemplateCard
              key={game.id}
              game={game}
              index={index + 1} // For the "1", "2" numbering in your sketch
              onClick={() => onSelectGame(game)} // When card is clicked, tell App.js to switch screen
            />
          ))}
          {filteredGames.length === 0 && (
            <p className="col-span-full text-center text-gray-400">No templates found matching your search.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;