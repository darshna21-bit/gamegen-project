import React, { useState } from 'react';
import GameTemplateCard from './GameTemplateCard'; // This imports the next component

// Define your game templates here. These are the ones shown on the homepage.
const gameTemplates = [
  { id: 'flappy-bird', name: 'Flappy Bird', description: 'Help the bird fly through pipes!', thumbnail: 'flappy_bird_thumbnail.png' },
  { id: 'Whack-A-Mole', name: 'Whack-A-Mole', description: 'Test your reflexes, whack the moles!', thumbnail: 'whack_the_mole_thumbnail.jpg'},
  { id: 'simple-match-3', name: 'Simple Match-3', description: 'Match colorful gems to clear the board.', thumbnail: 'simple_match_3_thumbnail.png' },
  { id: 'crossy-road', name: 'Crossy Road', description: 'Cross roads and rivers, don\'t get hit.', thumbnail: 'crussy_road_thumbnail1.png' },
  { id: 'speed-runner', name: 'Speed Runner', description: 'Run fast and move left or right to avoid obstacles.', thumbnail: 'speed_runner_thumbnail.png' },
];

const HomePage = ({ onSelectGame }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter games based on search term
  const filteredGames = gameTemplates.filter(game =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col"> {/* Added flex flex-col to push footer to bottom */}
      <div className="max-w-4xl mx-auto flex-grow"> {/* Added flex-grow to main content area */}
        {/* Main Heading Block: GameGen Title and Subheading */}
        <div className="text-center mb-16"> {/* mb-16 provides space below this block */}
          <h2 className="text-4xl font-bold font-alagard text-purple-400 pb-2">
            GameGen: Create. Innovate. Play. 🚀
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            A Genplay Studio Production. Unleash your imagination on a no-code,<br></br>
            AI-driven platform. Design, customize, and export your next HTML5 game masterpiece with ease!
          </p>
        </div>

        {/* "Choose Your Game Template" Title */}
        <h3 className="text-3xl font-bold font-alagard text-center mb-8 text-purple-300">
          Choose Your Game Template
        </h3>

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

        {/* --- Message about More Templates --- */}
        <p className="text-center text-lg text-gray-400 mt-16 mb-8"> {/* Adjusted margins for spacing */}
          Always evolving, always expanding! We're continuously adding new and innovative game templates.
          <br></br>Stay tuned for more ways to unleash your creativity!
        </p>
        {/* --- End Message about More Templates --- */}

      </div> {/* End of max-w-4xl mx-auto content div */}

      {/* --- FOOTER SECTION --- */}
      <footer className="w-full bg-gray-800 py-6 mt-16"> {/* Added mt-16 for spacing from content */}
        <div className="max-w-4xl mx-auto text-center text-gray-400 text-sm">
          <p>
            © 2025 Genplay Studio. All rights reserved. | GameGen: Where your imagination takes play.
          </p>
        </div>
      </footer>
      {/* --- END FOOTER SECTION --- */}

    </div> // End of min-h-screen container
  );
};

export default HomePage;