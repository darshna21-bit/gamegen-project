// gamegen-ui/api/generate-image.js

// Import Buffer for Node.js environments (if not globally available)
import { Buffer } from 'buffer';
// You might also need to install node-fetch if your serverless environment
// doesn't provide fetch globally for the live AI call part.
// const fetch = require('node-fetch'); // If using CommonJS syntax
// import fetch from 'node-fetch'; // If using ES Module syntax (uncomment if needed)

// --- Configuration from environment variables ---
const HF_API_TOKEN = process.env.NEXT_PUBLIC_HF_API_TOKEN;
const LIVE_AI_MODE = process.env.NEXT_PUBLIC_LIVE_AI_MODE === 'true'; // Converts string "true" to boolean true
// Ensure your HF_API_URL env variable points to the model endpoint, e.g.,
// https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0
const HF_API_URL = process.env.NEXT_PUBLIC_HF_API_URL;

// --- Helper function to format frame numbers for different naming conventions ---
// This ensures 'skeleton-animation_00.png', 'eagle000.png', 'man000.png', 'frame-1.png' are generated correctly
const getFrameFilename = (prefix, frameIndex) => {
    // Example: skeleton-animation_00.png to _10.png (index 0 to 10)
    if (prefix.includes('skeleton-animation_')) {
        return `${prefix}${String(frameIndex).padStart(2, '0')}.png`;
    }
    // Example: man000.png to man003.png (index 0 to 3)
    if (prefix.includes('man')) {
        return `${prefix}${String(frameIndex).padStart(3, '0')}.png`;
    }
    // Example: frame-1.png, frame-2.png (index 0 for frame-1, index 1 for frame-2)
    // IMPORTANT: 'frame-' prefix implies 1-indexed frames (frame-1, frame-2 etc.)
    // If your frames are 0-indexed (frame-0, frame-1), change frameIndex + 1 to frameIndex.
    if (prefix.includes('frame-')) {
        return `${prefix}${frameIndex + 1}.png`;
    }
    // Default fallback if no specific convention
    return `${prefix}${frameIndex}.png`;
};


// --- YOUR PRE-GENERATED ASSET MAPPING ---
// This is your "AI's knowledge base" for the demo
// Ensure all paths start with /ai_assets/ and match your folder structure exactly.
const PREGEN_ASSET_MAP = {
    'flappy-bird': {
        'character': {
            '_default': '/games/flappy-bird/assets/images/yellowbird-midflap.png', // This should match your default in App.js
            'yellow bird': '/games/flappy-bird/assets/images/yellowbird-midflap.png',
            
            // Animated characters (based on your provided paths)
            'skeleton bird': {
                isAnimated: true,
                prefix: '/ai_assets/open_flappy_bird/box bird/skeleton-animation_', // Matches skeleton-animation_00.png to _10.png
                count: 11, // 0 to 10
                frameWidth: 32, // *CONFIRM THIS VALUE* (estimate, measure in editor)
                frameHeight: 32 // *CONFIRM THIS VALUE*
            },
            // 'eagle' is ignored as per user request
            // 'eagle': {
            //     isAnimated: true,
            //     prefix: '/ai_assets/open_flappy_bird/eagle/eagle', // Matches eagle000.png to eagle005.png
            //     count: 6, // 0 to 5
            //     frameWidth: 48, // *CONFIRM THIS VALUE* (estimate, measure precisely)
            //     frameHeight: 26 // *CONFIRM THIS VALUE*
            // },
            'man character': { // Use 'man character' or 'human character' for prompt
                imageUrl: '/ai_assets/open_flappy_bird/man/man000',
                isAnimated: true,
                prefix: '/ai_assets/open_flappy_bird/man/man00', // Matches man000.png to man003.png
                count: 4, // 0 to 3
                frameWidth: 43, // *CONFIRM THIS VALUE*
                frameHeight: 30 // *CONFIRM THIS VALUE*
            },
            'box bird':{
                imageUrl: '/ai_assets/open_flappy_bird/box bird/skeleton-animation_00.png', // First frame for preview
                isAnimated: true,
                prefix: '/ai_assets/open_flappy_bird/box bird/skeleton-animation_',
                count: 10, // Based on frame-1.png, frame-2.png
                frameWidth: 43, // *CONFIRM THIS VALUE* (from your bird.js, 43x30)
                frameHeight: 30 // *CONFIRM THIS VALUE*

            },
            'red bird': {
                imageUrl: '/ai_assets/open_flappy_bird/red bird/flying/frame-1.png', // First frame for preview
                isAnimated: true,
                prefix: '/ai_assets/open_flappy_bird/red bird/flying/frame-',
                count: 2, // Based on frame-1.png, frame-2.png
                frameWidth: 43, // *CONFIRM THIS VALUE* (from your bird.js, 43x30)
                frameHeight: 30 // *CONFIRM THIS VALUE*
            },
        },
        'obstacle': { // For pipes
            // Using precise names based on your pipes folder
            'green pipes': '/ai_assets/open_flappy_bird/pipes/green_pipe.png',
            'red pipes': '/ai_assets/open_flappy_bird/pipes/red_pipe.png',
            'red pipe': '/ai_assets/open_flappy_bird/pipes/red_pipe.png', // Added for exact match
            'blue pipes': '/ai_assets/open_flappy_bird/pipes/blue_pipe.png',
            'purple pipes': '/ai_assets/open_flappy_bird/pipes/puple_pipe.png',
            'grey pipes': '/ai_assets/open_flappy_bird/pipes/grey_pipe.png',
            'yellow pipes': '/ai_assets/open_flappy_bird/pipes/yellow_pipe.png',
            '_default': '/games/flappy-bird/assets/images/pipe.png'
        },
        'background': {
            'city background': '/ai_assets/open_flappy_bird/bg.png',
            'night background': '/ai_assets/open_flappy_bird/bg_night.png',
            'dark background': '/ai_assets/open_flappy_bird/dark_background.png',
            'dark': '/ai_assets/open_flappy_bird/dark_background.png', // Added for exact match
            'horror background': '/ai_assets/open_flappy_bird/dark_background.png',
            '_default': '/games/flappy-bird/assets/images/background.png'
        },
        // 'gameover' asset is not typically generated by AI, but included for completeness if needed
        'gameover': {
            isAnimated: false,
            imageUrl: '/games/flappy-bird/assets/images/gameover.png',
            frameWidth: 360, // Placeholder
            frameHeight: 640 // Placeholder
        }
    },
    'Whack-A-Mole': {
        'ground': {
            // Default ground texture if no specific prompt matches
            '_default': '/games/Whack-A-Mole/css/background.jpg', // Original game default
            // AI-generated ground textures (based on your uploaded images)
            'grey stone background': '/ai_assets/open_whack_a_mole/grey_stone_background.png',
            'sand background': '/ai_assets/open_whack_a_mole/sand_background.png',
            'snowy winter landscape': '/ai_assets/open_whack_a_mole/snowy_background.png', // Assuming snowy_background.png is the snowy one
            'stone with grass': '/ai_assets/open_whack_a_mole/stone_with_grass.png',
            // You can add more prompts here that map to these same images if desired,
            // e.g., 'rocky ground': '/ai_assets/open_whack_a_mole/grey_stone_background.png',
        },
        'moleCharacter': {
            // Default mole character
            '_default': '/games/Whack-A-Mole/css/mole.png', // Assuming you have a default mole image in the game's assets
            // AI-generated mole characters (based on your uploaded images)
            'alien mole': '/ai_assets/open_whack_a_mole/alien.png',
            'cute hamster mole': '/ai_assets/open_whack_a_mole/cute_hamster.png',
            'ugly rat mole': '/ai_assets/open_whack_a_mole/ugly_rat.png', // Assuming 'ugly_ratang.png' is an ugly cat-like mole
            'skull mole': '/ai_assets/open_whack_a_mole/skull.png',
            'cute mole': '/ai_assets/open_whack_a_mole/cute_mole_spec.png', // For 'cute_mole_spec.png'
            'girl monster mole': '/ai_assets/open_whack_a_mole/girl_monster.png', // For 'girl_monster.png'
            // Add more specific prompts for these if you want, e.g.:
            // 'skeleton head mole': '/ai_assets/open_whack_a_mole/skull.png',
        },
    },
    'speed-runner': {
        'character': {
            '_default': '/ai_assets/open_speed_runner/blue_aeroplane.png',
            'blue aeroplane': '/ai_assets/open_speed_runner/blue_aeroplane.png',
            'aeroplane': '/ai_assets/open_speed_runner/blue_aeroplane.png',
            'plane': '/ai_assets/open_speed_runner/blue_aeroplane.png',
        },
        'obstacle': {
            '_default': '/ai_assets/open_speed_runner/blue_box.png',
            'blue box': '/ai_assets/open_speed_runner/blue_box.png',
            'box': '/ai_assets/open_speed_runner/blue_box.png',
            urls: [ // Provide an array of URLs if you want multiple obstacle types
                '/ai_assets/open_speed_runner/blue_box.png',
                // Add other obstacle image URLs here if available, e.g.:
                // '/ai_assets/open_speed_runner/another_obstacle.png',
            ]
        },
        // 'background' asset type is REMOVED from speed-runner's aiAssets in PREGEN_ASSET_MAP, as per your request.
    },
    'simple-match-3': {
        'background': {
            '_default': '/games/simple-match-3/background.jpg',
            'cute background': '/ai_assets/open_simple_match_3/cute_background_with_candies.jpg',
            'deep space nebula': '/ai_assets/open_simple_match_3/sky_blue_background.jpg',
            'sky blue': '/ai_assets/open_simple_match_3/sky_blue_background.jpg',
        },
        'gemSet': {
            '_default': null, // No default AI gemSet, game uses its internal default
            'cute candies with different shapes': {
                isAnimated: false,
                urls: [
                    '/ai_assets/open_simple_match_3/pink_heart.png',
                    '/ai_assets/open_simple_match_3/pink_star.png',
                    '/ai_assets/open_simple_match_3/pink_circle.png',
                    '/ai_assets/open_simple_match_3/yellow_heart.png',
                    '/ai_assets/open_simple_match_3/yellow_star.png',
                    '/ai_assets/open_simple_match_3/yellow_circle.png',
                    '/ai_assets/open_simple_match_3/blue_heart.png',
                    '/ai_assets/open_simple_match_3/blue_star.png',
                    '/ai_assets/open_simple_match_3/blue_circle.png',
                ]
            },
            'cute pixel art fruits': {
                isAnimated: false,
                urls: [
                    '/ai_assets/open_simple_match_3/pink_heart.png',
                    '/ai_assets/open_simple_match_3/yellow_circle.png',
                    '/ai_assets/open_simple_match_3/blue_star.png',
                ]
            }
        }
    },
     'crossy-road': {
         'character': {
            '_default': '/games/crossy-road/images/char-boy.png', // Default character
            'cat girl': '/ai_assets/open_crossy_road/char-cat-girl.png',
            'horn girl': '/ai_assets/open_crossy_road/char-horn-girl.png',
            'pink girl': '/ai_assets/open_crossy_road/char-pink-girl.png',
            'princess girl': '/ai_assets/open_crossy_road/char-princess-girl.png',
            // Add more character mappings here if you have other character images
        },
        'obstacle': {
            '_default': '/games/crossy-road/images/enemy-bug.png', // Default obstacle
            'game spider': '/ai_assets/open_crossy_road/enemy_game_spider.png',
            'orange spider': '/ai_assets/open_crossy_road/orange-spider.png',
            // Add more obstacle mappings here if you have other enemy/obstacle images
        },
    },
};

// Main handler function for the API route
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { gameTemplate, assetType, prompt, userSessionId } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, message: 'Prompt is required.' });
    }

    console.log(`[Backend API]: Received request for ${gameTemplate}, assetType: ${assetType}, prompt: "${prompt}"`);

    try {
        let imageUrl = null;
        let animationData = null;
        let serverFilePath = null; // Path on the server's file system for export
        let urls = null; // For assets with multiple URLs

        if (LIVE_AI_MODE && HF_API_TOKEN && HF_API_URL) {
            console.log("[Backend API]: LIVE_AI_MODE is ON. Attempting to call Hugging Face API...");
            // --- LIVE AI GENERATION (PLACEHOLDER) ---
            // In a real scenario, you'd make a call to your AI model here.
            // This is a simplified example for Stable Diffusion XL.
            // You'd need a more robust solution for saving images to disk.
            const response = await fetch(
                HF_API_URL,
                {
                    headers: {
                        Authorization: `Bearer ${HF_API_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({ inputs: prompt }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Hugging Face API error: ${response.status} - ${errorText}`);
                throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
            }

            const imageBlob = await response.blob();
            const arrayBuffer = await imageBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // In a real application, you would save this 'buffer' to a file
            // in your public directory and generate a public URL for it.
            // For this mock, we'll just return a generic placeholder URL.
            const timestamp = Date.now();
            const generatedFileName = `${assetType}_${userSessionId}_${timestamp}.png`;
            imageUrl = `/ai_assets/${gameTemplate}/${generatedFileName}`;
            serverFilePath = `/public/ai_assets/${gameTemplate}/${generatedFileName}`; // This would be the actual path where you save it

            // If the AI model can generate animated sprites, you'd process that here
            // For now, assume single image generation in LIVE_AI_MODE
            animationData = { isAnimated: false };

            console.log(`[Backend API]: Live AI generated image URL: ${imageUrl}`);

        } else {
            console.log("[Backend API]: LIVE_AI_MODE is OFF. Serving pre-generated assets.");
            // --- SERVING PRE-GENERATED ASSETS ---
            const gameAssets = PREGEN_ASSET_MAP[gameTemplate];
            console.log(`[generate-image.js API - Debug]: Looking up gameAssets for "${gameTemplate}". Result:`, gameAssets ? 'Found' : 'NOT Found', typeof gameAssets);
            if (!gameAssets) {
                return res.status(404).json({ success: false, message: `No assets configured for game: ${gameTemplate}` });
            }

            const assetCategory = gameAssets[assetType];
            console.log(`[generate-image.js API - Debug]: Looking up assetCategory "${assetType}" within gameAssets. Result:`, assetCategory ? 'Found' : 'NOT Found', typeof assetCategory);
            if (!assetCategory) {
                console.error(`[generate-image.js API]: ERROR: No assets of type ${assetType} configured for game: ${gameTemplate}`);
                return res.status(404).json({ success: false, message: `No assets of type ${assetType} configured for game: ${gameTemplate}` });
            }

            const normalizedPrompt = prompt.toLowerCase();
            let assetInfo = assetCategory[normalizedPrompt];
            console.log(`[generate-image.js API]: Looking for prompt "${normalizedPrompt}" in assetCategory "${assetType}". Found initially:`, assetInfo);

            // Fallback to default if specific prompt not found
            if (!assetInfo) {
                assetInfo = assetCategory['_default'];
                 console.log(`[generate-image.js API]: Prompt "${normalizedPrompt}" not found, falling back to _default. Found:`, assetInfo);
            }

            if (!assetInfo) {
                console.error(`[generate-image.js API]: ERROR: No asset found for prompt "${prompt}" or default for ${assetType}.`);
                return res.status(404).json({ success: false, message: `No asset found for prompt "${prompt}" or default for ${assetType}.` });
            }

            // Determine response based on assetInfo type
            if (typeof assetInfo === 'string') { // Static image URL
                imageUrl = assetInfo;
                animationData = { isAnimated: false }; // Explicitly set isAnimated to false for static images
                serverFilePath = assetInfo; // For static assets, public URL is often the server path
                console.log(`[generate-image.js API]: Identified as static image. imageUrl: ${imageUrl}`);
            } else if (assetInfo.isAnimated) { // Animated asset
                animationData = assetInfo;
                // For preview, use the first frame or a specified imageUrl
                imageUrl = assetInfo.imageUrl || getFrameFilename(assetInfo.prefix, 0);
                serverFilePath = assetInfo.prefix; // Server path is the base prefix for animated assets
                console.log(`[generate-image.js API]: Identified as animated asset. Preview imageUrl: ${imageUrl}, animationData:`, animationData);
            } else if (assetInfo.urls && Array.isArray(assetInfo.urls)) { // Array of static images (e.g., gemSet, Speed Runner obstacles)
                // For preview, use the first URL in the array
                imageUrl = assetInfo.urls[0] || null;
                urls = assetInfo.urls; // Populate the 'urls' variable
                // For gemSet/obstacles, we send the array of URLs as 'urls' property in the response
                animationData = { isAnimated: false, urls: assetInfo.urls }; // Include urls within animationData for consistency in GameEditor
                serverFilePath = JSON.stringify(assetInfo.urls); // Store as JSON string for export
                console.log(`[generate-image.js API]: Identified as URL array (gemSet/obstacles). Preview imageUrl: ${imageUrl}, All URLs:`, urls);
            }  else {
                console.warn(`[generate-image.js API]: WARNING: Unhandled assetInfo type for ${assetType}:`, assetInfo);
                return res.status(500).json({ success: false, message: `Server error: Unhandled asset information for ${assetType}.` });
            }
        }
        console.log(`[generate-image.js API]: Final Response Data - imageUrl: ${imageUrl}, urls:`, urls, `animationData:`, animationData);


        res.status(200).json({
            success: true,
            imageUrl: imageUrl,
            animationData: animationData,
            serverFilePath: serverFilePath,
            urls: urls, // --- NEW: Include 'urls' array in the response ---
            message: `Asset generated successfully for prompt: "${prompt}"`
        });

    } catch (error) {
        console.error('Error in generate-image API:', error);
        res.status(500).json({ success: false, message: `Failed to generate asset: ${error.message}` });
    }
}
