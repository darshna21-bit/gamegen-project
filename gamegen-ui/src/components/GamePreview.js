// gamegen-ui/src/components/GamePreview.js

import { forwardRef } from 'react';

// --- REMOVE THIS ENTIRE gameConfigs OBJECT from this file ---
// Reason: This config is no longer needed in GamePreview.js because
// GamePreview will not be constructing the URL with parameters.
// The templatePath will be passed directly via selectedGame.
/*
const gameConfigs = {
    // ... (your existing gameConfigs object) ...
};
*/

// --- REMOVE THIS HELPER FUNCTION ---
// Reason: This function was used for constructing URL parameters for animated assets,
// which we are no longer doing in GamePreview.js.
/*
function getFrameFilenameSuffix(prefix, frameIndex) {
    if (prefix.includes('skeleton-animation_')) {
        return String(frameIndex).padStart(2, '0');
    }
    if (prefix.includes('eagle')) {
        return String(frameIndex).padStart(3, '0');
    }
    if (prefix.includes('man')) {
        return String(frameIndex).padStart(3, '0');
    }
    if (prefix.includes('frame-')) {
        return String(frameIndex + 1); // Assuming 1-indexed for 'frame-'
    }
    return String(frameIndex); // Default
}
*/

// GamePreview component receives selectedGame, gameSettings, and currentAssets from App.js
// Note: gameSettings and currentAssets are no longer used directly by GamePreview,
// but they are still passed to GameEditor which uses them.
const GamePreview = forwardRef(function GamePreview({ selectedGame, gameSettings, currentAssets }, ref) {
    // Get the configuration for the currently selected game
    // Reason: We still need config to get the templatePath and isLandscape property.
    // Ensure gameConfigs is imported or available from a shared source if it's not removed globally.
    // For now, let's assume it's imported from a shared file, or passed down correctly.
    // If gameConfigs is globally available or imported in App.js, it should be fine.
    // For this specific component, we only need selectedGame.templatePath and selectedGame.isLandscape.
    // Let's assume selectedGame already has these properties.
    const config = selectedGame; // selectedGame object should contain templatePath and isLandscape

    // --- REMOVE ALL URLSearchParams RELATED LOGIC ---
    // Reason: This is the core of the conflict. We are no longer passing data via URL.
    /*
    const params = new URLSearchParams();

    Object.keys(gameSettings).forEach(key => {
        params.append(key, gameSettings[key]);
    });

    Object.keys(currentAssets).forEach(assetType => {
        const assetData = currentAssets[assetType];

        if (assetData) {
            if (typeof assetData === 'object' && assetData.isAnimated) {
                params.append(`${assetType}IsAnimated`, 'true');
                params.append(`${assetType}Prefix`, assetData.prefix);
                params.append(`${assetType}Count`, assetData.count);
                params.append(`${assetType}FrameWidth`, assetData.frameWidth);
                params.append(`${assetType}FrameHeight`, assetData.frameHeight);
                params.append(`${assetType}InitialFrame`, `${assetData.prefix}${getFrameFilenameSuffix(assetData.prefix, 0)}`);
            } else {
                params.append(`${assetType}ImageUrl`, assetData);
            }
        }
    });

    const gameUrl = `${config.templatePath}?${params.toString()}`;
    */

    // --- REMOVE THIS DEBUGGING LINE ---
    // console.log("GamePreview iframe URL:", gameUrl);

    return (
        <div className={`w-full h-full bg-black rounded-lg overflow-hidden ${config.isLandscape ? 'aspect-video' : 'aspect-square'}`}>
            <iframe
                ref={ref}
                // --- CHANGE THIS LINE ---
                // src={gameUrl} // BEFORE
                src={config.templatePath} // AFTER: Simply load the base HTML template
                // Reason: This ensures the iframe only loads once initially and then
                // GameEditor.js can communicate with it via postMessage without reloads.
                title={`${config.title} Preview`}
                className="w-full h-full border-none"
                allowFullScreen
            ></iframe>
        </div>
    );
});

export default GamePreview;