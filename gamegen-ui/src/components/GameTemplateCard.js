import React from 'react';

const GameTemplateCard = ({ game, index, onClick }) => {
  return (
    <div
      className="bg-gray-800 rounded-xl shadow-lg cursor-pointer
                 hover:shadow-xl hover:ring-2 hover:ring-purple-600 transition-all duration-200
                 flex flex-col items-center text-center relative" // Removed initial p-6 here
      onClick={onClick}
    >
      {/* Game Number - Positioned absolutely at the top-left corner */}
      <div className="absolute top-4 left-4 w-10 h-10 bg-purple-700 rounded-full flex items-center justify-center text-white font-bold text-lg z-10">
        {index}
      </div>

      {game.thumbnail && (
        <img
          src={`/thumbnails/${game.thumbnail}`} // Path to your image in public/thumbnails/
          alt={game.name} // Alt text for accessibility, using the game's name
          // --- UPDATED TAILWIND CLASSES FOR IMAGE STYLING ---
          className="w-full h-40 object-cover px-2 pt-2 rounded-t-xl" // w-full, h-40, object-cover, px-2 pt-2 for margins, rounded-t-xl
        />
      )}

      {/* Content area for title, description, and "..." with its own padding */}
      {/* This div will now handle the padding for the text content, separate from the image. */}
      <div className="p-6 pt-4 w-full">
        <h3 className="text-2xl font-bold font-alagard text-purple-300 mb-2">{game.name}</h3>
        <p className="text-gray-400 text-sm">{game.description}</p>
        {/* <span className="mt-4 text-gray-500 text-xl font-bold">...</span> */}
      </div>
    </div>
  );
};

export default GameTemplateCard;