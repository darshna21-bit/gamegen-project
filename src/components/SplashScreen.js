import React from 'react';

const SplashScreen = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center">
      <h1
        className="text-7xl font-bold font-alagard text-white animate-fade-in-scale" // Using font-alagard
        style={{ textShadow: '4px 4px 8px rgba(0,0,0,0.5)' }}
      >
        Welcome to GameGen
      </h1>
      {/* This style block defines the animation. For production, move to index.css or a dedicated CSS file. */}
      <style>{`
        @keyframes fade-in-scale {
          0% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;