// src/components/GamePreview.js

import { forwardRef } from 'react';

const GamePreview = forwardRef(function GamePreview(props, ref) {
  const gameUrl = "/games/flappy-bird/index.html";

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden">
      <iframe
        ref={ref}
        src={gameUrl}
        title="Game Preview"
        className="w-full h-full border-none"
      ></iframe>
    </div>
  );
});

export default GamePreview;