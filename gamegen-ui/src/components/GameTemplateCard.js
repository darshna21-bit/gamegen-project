import React from 'react';

const GameTemplateCard = ({ game, index, onClick }) => {
  return (
    <div
      className="bg-gray-800 rounded-xl shadow-lg p-6 cursor-pointer
                 hover:shadow-xl hover:ring-2 hover:ring-purple-600 transition-all duration-200
                 flex flex-col items-center text-center"
      onClick={onClick} // This triggers the function passed from HomePage (which comes from App.js)
    >
      <div className="flex items-center justify-center w-16 h-16 bg-purple-700 rounded-full mb-4 text-3xl font-bold">
        {index} {/* The "1", "2" circles from your sketch */}
      </div>
      {/* You can add an image here later if you create thumbnails, e.g.:
      {game.thumbnail && (
        <img src={`/images/${game.thumbnail}`} alt={game.name} className="w-24 h-24 object-contain mb-4 rounded-lg" />
      )}
      */}
      <h3 className="text-2xl font-bold font-alagard text-purple-300 mb-2">{game.name}</h3>
      <p className="text-gray-400 text-sm">{game.description}</p>
      <span className="mt-4 text-gray-500 text-xl font-bold">...</span> {/* The "..." from your sketch */}
    </div>
  );
};

export default GameTemplateCard;