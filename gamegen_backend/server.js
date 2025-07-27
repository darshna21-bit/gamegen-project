require('dotenv').config(); // MUST be at the very top to load .env variables

const express = require('express');
const path = require('path');
const fs = require('fs'); // Import the regular 'fs' module for createWriteStream
const fsp = require('fs/promises'); // Use fsp for promise-based file operations (like readFile, mkdir, unlink)
const cors = require('cors');
const archiver = require('archiver'); // For creating zip files
const fetch = require('node-fetch').default; 

// NEW: Import fs-extra for robust directory copying/deletion
const fse = require('fs-extra'); 

const app = express();
const PORT = process.env.PORT || 5000;

// Segmind API Key (Accessed securely from .env)
const SEGMIND_API_KEY = process.env.SEGMIND_API_KEY;

// Middleware
app.use(cors()); // Enable CORS for all routes (important for frontend communication)
app.use(express.json({ limit: '50mb' })); // To parse JSON request bodies, increased limit for images

// --- Directory Paths ---
const PROJECT_ROOT_DIR = path.join(__dirname, '..'); // Points to GAMEGENPROJECT
const REACT_APP_ROOT_DIR = path.join(PROJECT_ROOT_DIR, 'gamegen-ui'); // Points to gamegen-ui
const GAMES_DIR = path.join(REACT_APP_ROOT_DIR, 'public', 'games'); // Points to gamegen-ui/public/games

// NEW: Create a dedicated temporary directory within backend for assets during export.
const TEMP_EXPORT_DIR = path.join(__dirname, 'temp_export_games'); // To hold the copied game + assets
const TEMP_ASSET_UPLOAD_DIR = path.join(__dirname, 'temp_uploaded_ai_assets'); // To hold temporary Base64 images before zipping
const TEMP_ZIPS_DIR = path.join(__dirname, 'temp_zips'); // For the final zip files // <-- ADDED THIS LINE FOR TEMP ZIPS DIR

// Helper function to determine main game JS file (UNCHANGED)
const getMainJsFileName = async (gameTemplateName) => {
    const potentialPaths = {
        'flappy-bird': ['src/app.js'], 'speed-runner': ['engine.js'], 'Whack-A-Mole': ['js/script.js'],
        'simple-match-3': ['script.js'], 'crossy-road': ['js/app.js', 'js/engine.js'],
    };
    const namesToCheck = potentialPaths[gameTemplateName];
    if (namesToCheck) {
        for (const name of namesToCheck) {
            const filePath = path.join(GAMES_DIR, gameTemplateName, name);
            try { await fsp.access(filePath); console.log(`Found main JS file for ${gameTemplateName}: ${name}`); return name; }
            catch (e) { /* ignore */ }
        }
    }
    console.warn(`Could not find main JS file for ${gameTemplateName}. Tried: ${namesToCheck ? namesToCheck.join(', ') : 'none'}`);
    return null;
};

// JavaScript Variable to Asset Path/Parameter Mapping (UNCHANGED)
const jsVariableToAssetPathMapping = {
    'flappy-bird': {
        gravity: 'GRAVITY', pipeGap: 'PIPE_GAP', speed: 'PIPE_BASE_SPEED',
        character: 'NOT_A_DIRECT_VAR_SPECIAL_CASE_BIRD_IMAGE', // Placeholder for bird image
        obstacle: 'currentPipeImageUrl', background: 'currentBackgroundImageUrl',
    },
    'Whack-A-Mole': {
        moleSpawnRate: 'velocity_level', gameDuration: 'time_level',
        moleCharacter: 'currentMoleImageUrl', ground: 'currentGroundImageUrl',
    },
    'speed-runner': {
        playerSpeedX: 'appInitialBlockSpeed', obstacleSpawnDelay: 'appObstacleSpawnIntervalMs',
        character: 'appMainCharacterImageUrls', background: 'appBackgroundImageUrl', obstacle: 'appObstacleImageUrls',
    },
    'simple-match-3': {
        rows: 'rows', columns: 'columns', scorePerMatch: 'scorePerMatch', gameDuration: 'gameDuration',
        gemSet: 'currentGemSetUrls', // Ensure this maps to where your game JS expects the array of gem URLs
    },
    'crossy-road': {
        obstacleSpeed: 'obstacleSpeed', trafficDensity: 'trafficDensity', playerMoveDelay: 'playerMoveDelay', gameDuration: 'gameDuration',
        character: 'playerSpriteUrl', obstacle: 'enemySpriteUrl',
    },
};

// API Route for Game Export (MODIFIED)
app.post('/api/export/:gameId', async (req, res) => {
    const { gameId } = req.params;
    const { gameParameters, aiAssetPaths, userSessionId } = req.body; 

    if (!gameId || !gameParameters || !aiAssetPaths || !userSessionId) {
        // Changed to send string for clarity, not JSON
        return res.status(400).send('Missing game data for export.');
    }

    const gameSourcePath = path.join(GAMES_DIR, gameId);
    // Temp dir for this specific game's files within backend's temp_export_games
    const outputGameDirPath = path.join(TEMP_EXPORT_DIR, `${gameId}_${userSessionId}`); 
    // Final zip location
    const zipFilePath = path.join(TEMP_ZIPS_DIR, `${gameId}_${userSessionId}_custom_game.zip`); 

    let cleanedUp = false; // Flag to ensure cleanup runs only once

    const cleanup = async () => {
        if (!cleanedUp) {
            try {
                // Remove temporary game directory and zip file
                if (fs.existsSync(outputGameDirPath)) await fse.remove(outputGameDirPath);
                if (fs.existsSync(zipFilePath)) await fse.remove(zipFilePath);
                // Clean up all temporary asset files created during this export process
                // It's safer to emptyDir than remove/mkdir to avoid permission issues if re-created too fast
                if (fs.existsSync(TEMP_ASSET_UPLOAD_DIR)) await fse.emptyDir(TEMP_ASSET_UPLOAD_DIR); 
                console.log('Cleaned up temporary export files.');
            } catch (cleanupErr) {
                console.error('Error during cleanup:', cleanupErr);
            } finally {
                cleanedUp = true; // Mark as cleaned up regardless of success
            }
        }
    };


    try {
        // Ensure parent temp directories exist and are empty
        await fse.emptyDir(TEMP_EXPORT_DIR); // Clear previous exports from this run
        await fse.emptyDir(TEMP_ZIPS_DIR); // Clear previous zips from this run
        await fse.emptyDir(TEMP_ASSET_UPLOAD_DIR); // Clear previous temp assets from this run

        // 1. Copy the entire game template to a temporary working directory
        await fse.copy(gameSourcePath, outputGameDirPath);
        console.log(`Copied game template from ${gameSourcePath} to ${outputGameDirPath}`);

        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        output.on('close', async () => {
            console.log(`ZIP created: ${archive.pointer()} total bytes at ${zipFilePath}`);
            // 4. Send the zip file to the client for download
            res.download(zipFilePath, `${gameId}_custom_game.zip`, async (err) => {
                if (err) {
                    console.error('Error sending file during download:', err);
                    // Don't send status if headers might already be sent by res.download error
                }
                await cleanup(); // Ensure cleanup after download attempt (success or failure)
            });
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Archiver warning (file not found):', err);
            } else {
                // For other warnings, rethrow them as errors
                console.error('Archiver error warning:', err); // Log non-ENOENT warnings as errors
                throw err;
            }
        });

        archive.on('error', async (err) => {
            console.error('Archiver critical error:', err);
            await cleanup(); // Ensure cleanup on archiving error
            res.status(500).send(`Archiving failed: ${err.message}`); // Send error response to client
        });

        archive.pipe(output);

        // --- OLD: index.html injection logic REMOVED. NEW: Inject into main JS file directly ---
        // 2. Inject global data (gameParameters and aiAssetPaths) directly into the main JS file
        const mainJsFileName = await getMainJsFileName(gameId);
        if (mainJsFileName) {
            const mainJsFilePathInTemp = path.join(outputGameDirPath, mainJsFileName);
            let jsCode = await fsp.readFile(mainJsFilePathInTemp, 'utf8');

            // The data will now be defined as top-level const variables in the JS file.
            // Game's JS files will need to read these.
            const injectedGlobals = `
                // Injected by backend for exported game data - DO NOT MODIFY THESE LINES IN EXPORTED GAME
                const EXPORTED_GAME_PARAMETERS = ${JSON.stringify(gameParameters, null, 2)};
                const EXPORTED_CURRENT_ASSETS = ${JSON.stringify(aiAssetPaths, null, 2)};
                // console.log('Injected globals for exported game:', EXPORTED_GAME_PARAMETERS, EXPORTED_CURRENT_ASSETS); // Uncomment in exported game for debugging
            `;
            // Prepend the injected globals to the JS file content
            jsCode = injectedGlobals + jsCode;
            await fsp.writeFile(mainJsFilePathInTemp, jsCode);
            console.log(`Injected data into ${mainJsFilePathInTemp}`);
        } else {
            console.warn(`No main JS file found for ${gameId}. Cannot inject parameters/assets directly.`);
            // Continue even if main JS is not found, other files might still be needed
        }


        // 3. Process AI assets from frontend (aiAssetPaths), save them temporarily, and add them to the zip
        for (const assetType in aiAssetPaths) {
            const aiAssetDataFromFrontend = aiAssetPaths[assetType];
            
            if (typeof aiAssetDataFromFrontend === 'string' && aiAssetDataFromFrontend.startsWith('data:image/')) {
                const base64Content = aiAssetDataFromFrontend.split(',')[1];
                const mimeType = aiAssetDataFromFrontend.split(',')[0].split(':')[1].split(';')[0];
                const fileExtension = mimeType.split('/')[1] || 'png';

                const tempFileName = `${gameId}_${assetType}_${Date.now()}.${fileExtension}`;
                const tempFilePath = path.join(TEMP_ASSET_UPLOAD_DIR, tempFileName);

                await fsp.writeFile(tempFilePath, base64Content, { encoding: 'base64' });
                console.log(`Saved temporary AI asset for export: ${tempFilePath}`);

                // The path within the ZIP relative to the game's root
                const assetPathInZip = getZipAssetPath(tempFileName, gameId, assetType);
                // Add the temporary asset file to the archive, placing it correctly relative to the game's root
                // For Flappy Bird, 'assets/images/...' should be correct if gameId folder is not in zip path
                archive.file(tempFilePath, { name: assetPathInZip }); 
                console.log(`Added temp AI asset to archive: ${assetPathInZip}`);

            } else if (typeof aiAssetDataFromFrontend === 'object' && aiAssetDataFromFrontend !== null && aiAssetDataFromFrontend.urls && Array.isArray(aiAssetDataFromFrontend.urls)) {
                // Handles array of Base64 image assets (like gemSet for Match-3)
                console.log(`Processing array of AI assets for export: ${assetType}`);
                for (const [index, dataUrl] of aiAssetDataFromFrontend.urls.entries()) {
                    const base64Content = dataUrl.split(',')[1];
                    const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
                    const fileExtension = mimeType.split('/')[1] || 'png';

                    const tempFileName = `${gameId}_${assetType}_${index}_${Date.now()}.${fileExtension}`;
                    const tempFilePath = path.join(TEMP_ASSET_UPLOAD_DIR, tempFileName);

                    await fsp.writeFile(tempFilePath, base64Content, { encoding: 'base64' });
                    console.log(`Saved temporary AI array asset for export: ${tempFilePath}`);

                    const assetPathInZip = getZipAssetPath(tempFileName, gameId, assetType);
                    archive.file(tempFilePath, { name: assetPathInZip });
                    console.log(`Added temp AI array asset to archive: ${assetPathInZip}`);
                }
            } else {
                console.warn(`Unrecognized AI asset data type for export: ${assetType}. Skipping.`);
            }
        }
        
        // Add the entire copied game directory content to the root of the zip
        // This includes all original HTML, CSS, and JS files (including the modified main JS file).
        archive.directory(outputGameDirPath, false); 

        archive.finalize(); // Finalize the archive. This triggers the 'close' event on 'output'.

    } catch (error) {
        console.error('Error during game export processing:', error);
        res.status(500).send(`Server error during export: ${error.message}`); // Send error response
        await cleanup(); // Ensure cleanup on error
    }
});


// --- Segmind AI Image Generation Route (/api/generate-asset) ---
// This route acts as a proxy to Segmind's text-to-image and background removal APIs.
// (UNCHANGED from your provided code, keep as is)
app.post('/api/generate-asset', async (req, res) => {
    const { prompt, assetType } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }
    if (!SEGMIND_API_KEY) {
        console.error('SEGMIND_API_KEY is not set in backend .env');
        return res.status(500).json({ success: false, error: 'Server configuration error: API key missing.' });
    }

    if (assetType === 'gemSet') {
        try {
            const numGems = 6;
            const gemImageUrls = [];
            console.log(`%c[Backend]: Generating ${numGems} gem images for prompt: "${prompt}"`, 'color: yellow;');

            for (let i = 0; i < numGems; i++) {
                const gemPrompt = `${prompt} - gem ${i + 1}, unique, distinct, transparent background, cartoon style, highly detailed, game icon, no numbers or letters`;
                const textToImagePayload = {
                    prompt: gemPrompt,
                    width: 256,
                    height: 256,
                    samples: 1,
                    scheduler: 'UniPC',
                    num_inference_steps: 25,
                    negative_prompt: "(worst quality, low quality, blurred, text, watermark, writing, ugly, deformed, disfigured)",
                    guidance_scale: 9,
                    seed: Math.floor(Math.random() * 1000000) + i,
                    base64: true
                };

                console.log(`%c[Backend]: Calling Segmind Text-to-Image for gem ${i + 1}...`, 'color: cyan;', textToImagePayload.prompt);
                const textToImageResponse = await fetch('https://api.segmind.com/v1/segmind-vega', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': SEGMIND_API_KEY },
                    body: JSON.stringify(textToImagePayload),
                });

                if (!textToImageResponse.ok) {
                    const errorData = await textToImageResponse.json();
                    console.error(`%c[Backend]: Segmind Text-to-Image Error for gem ${i + 1}:`, 'color: red;', errorData);
                    throw new Error(`Image generation failed for gem ${i + 1}: ${errorData.message || 'Unknown error'}`);
                }

                const imageData = await textToImageResponse.json();
                let base64Image = imageData.image;

                if (!base64Image) {
                    throw new Error(`No image data received for gem ${i + 1}.`);
                }
                console.log(`%c[Backend]: Text-to-Image successful for gem ${i + 1}. Proceeding to background removal.`, 'color: green;');

                const bgRemovalPayload = { image: base64Image };
                const bgRemovalResponse = await fetch('https://api.segmind.com/v1/bg-removal-v2', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': SEGMIND_API_KEY },
                    body: JSON.stringify(bgRemovalPayload),
                });

                if (!bgRemovalResponse.ok) {
                    let errorData;
                    try { errorData = await bgRemovalResponse.json(); }
                    catch (e) { errorData = { message: `Non-JSON error from BG Removal for gem ${i + 1}: ${await bgRemovalResponse.text()}` }; }
                    console.error(`%c[Backend]: Segmind Background Removal Error for gem ${i + 1}:`, 'color: red;', errorData);
                    throw new Error(`Background removal failed for gem ${i + 1}: ${errorData.message || 'Unknown error'}`);
                }

                const imageArrayBuffer = await bgRemovalResponse.arrayBuffer();
                const transparentImageBuffer = Buffer.from(imageArrayBuffer);
                const transparentImage = transparentImageBuffer.toString('base64');
                console.log(`%c[Backend]: Background removal successful for gem ${i + 1}.`, 'color: green;');

                gemImageUrls.push(`data:image/png;base64,${transparentImage}`);
            }

            console.log(`%c[Backend DEBUG - FINAL GEMSET]: Sending ${gemImageUrls.length} gem URLs to frontend. Checking uniqueness:`, 'color: yellow;');
            gemImageUrls.forEach((url, index) => {
                console.log(`%c[Backend DEBUG] Gem ${index}: ${url.substring(0, 50)}... (Length: ${url.length})`, 'color: yellow;');
            });

            res.json({ success: true, urls: gemImageUrls });
            return;
        } catch (error) {
            console.error('%c[Backend]: Error generating gemSet assets:', 'color: red;', error);
            return res.status(500).json({ success: false, error: `Failed to generate gem set: ${error.message}` });
        }
    }

    const textToImageEndpoint = 'https://api.segmind.com/v1/segmind-vega';
    let basePromptSuffix = '';
    let width = 768;
    let height = 768;

    if (assetType === 'character' || assetType === 'moleCharacter') {
        basePromptSuffix = ', game sprite, full body, transparent background, clean edges, isolated character, cartoon style';
        width = 512;
        height = 512;
    } else if (assetType === 'background' || assetType === 'ground') {
        basePromptSuffix = ', seamless game background, high quality, vibrant colors, game art style';
        width = 1024;
        height = 576;
    } else if (assetType === 'obstacle') {
        basePromptSuffix = ', game obstacle, detailed, transparent background, isolated';
        width = 512;
        height = 512;
    } else {
        basePromptSuffix = ', game asset, detailed, high quality';
    }

    try {
        const textToImagePayload = {
            prompt: `${prompt}${basePromptSuffix}`,
            width: width, height: height, samples: 1, scheduler: 'UniPC', num_inference_steps: 25,
            negative_prompt: "(worst quality, low quality, blurred, text, watermark, writing)",
            guidance_scale: 9,
            seed: Math.floor(Math.random() * 1000000),
            base64: true
        };

        console.log(`%cCalling Segmind Text-to-Image for ${assetType} with payload:`, 'color: cyan;', textToImagePayload);
        const textToImageResponse = await fetch(textToImageEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': SEGMIND_API_KEY },
            body: JSON.stringify(textToImagePayload),
        });

        if (!textToImageResponse.ok) {
            const errorData = await textToImageResponse.json();
            console.error(`%cSegmind Text-to-Image Error for ${assetType}:`, 'color: red;', errorData);
            return res.status(textToImageResponse.status).json({ success: false, error: `Image generation failed: ${errorData.message || 'Unknown error'}` });
        }

        const imageData = await textToImageResponse.json();
        const base64Image = imageData.image;

        if (!base64Image) { return res.status(500).json({ success: false, error: 'No image data received from text-to-image API.' }); }
        console.log(`%cText-to-Image successful for ${assetType}. Proceeding to background removal (if applicable).`, 'color: green;');

        if (assetType === 'background' || assetType === 'ground') {
            console.log(`%cSkipping background removal for a ${assetType} asset.`, 'color: grey;');
            res.json({ success: true, image: base64Image });
            return;
        }

        const bgRemovalPayload = { image: base64Image };
        const bgRemovalResponse = await fetch('https://api.segmind.com/v1/bg-removal-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': SEGMIND_API_KEY },
            body: JSON.stringify(bgRemovalPayload),
        });

        if (!bgRemovalResponse.ok) {
            let errorData;
            try {
                errorData = await bgRemovalResponse.json();
            } catch (e) {
                errorData = { message: `Non-JSON error response from BG Removal for ${assetType}: ${await bgRemovalResponse.text()}` };
            }
            console.error(`%cSegmind Background Removal Error for ${assetType}:`, 'color: red;', errorData);
            return res.status(bgRemovalResponse.status).json({ success: false, error: `Background removal failed: ${errorData.message || 'Unknown error'}` });
        }

        const imageArrayBuffer = await bgRemovalResponse.arrayBuffer();
        const transparentImageBuffer = Buffer.from(imageArrayBuffer);
        const transparentImage = transparentImageBuffer.toString('base64');

        console.log(`%cBackground removal successful for ${assetType}. Sending transparent image to frontend.`, 'color: green;');
        if (!transparentImage) { return res.status(500).json({ success: false, error: 'No transparent image data received.' }); }

        res.json({ success: true, image: transparentImage });

    } catch (error) {
        console.error('%cServer error during asset generation:', 'color: red;', error);
        res.status(500).json({ success: false, error: `Internal server error during asset generation: ${error.message}` });
    }
});

app.post('/api/generate-llm-text', async (req, res) => {
    const { prompt, gameId } = req.body;

    if (!prompt) { return res.status(400).json({ success: false, error: 'Prompt is required.' }); }
    if (!SEGMIND_API_KEY) { console.error('SEGMIND_API_KEY is not set in backend .env'); return res.status(500).json({ success: false, error: 'Server configuration error: API key missing.' }); }

    const gameContext = {
        'Whack-A-Mole': 'a game where a player hits moles that pop out of holes. It has a mole character, a ground background, a mole spawn rate, and game duration.',
        'flappy-bird': 'a game where a bird flies through pipes. It has a main character (bird), a pipe obstacle, game speed, pipe gap, and gravity.',
        'speed-runner': 'a game where a character runs and avoids obstacles. It.has a main character, obstacles, player speed, obstacle spawn delay, and a background.',
        'simple-match-3': 'a puzzle game where gems/candies are matched. It has board rows, columns, score per match, game duration, a background, and a gem set.',
        'crossy-road': 'a game where a character crosses roads and rivers avoiding traffic. It has a player character, vehicle/animal obstacles, obstacle speed, traffic density, and player movement delay.',
    }[gameId] || 'a classic video game. It has a main character, obstacles, and a background.';

    const llmPrompt = `
        You are an AI assistant specialized in generating game assets and settings based on user descriptions.
        The user wants to customize a game, described as: "${gameContext}".
        
        **Extract ONLY the following information into a JSON object:**
        1.  \`character_prompt\`: A concise, descriptive prompt for the **main game character or mole image**. Be specific and mention "game sprite" or "game character" and "transparent background" if appropriate for the asset type.
        2.  \`background_prompt\`: A concise, descriptive prompt for the **game's background image**. Be specific and mention "seamless game background" or "game environment".
        3.  \`obstacle_prompt\`: A concise, descriptive prompt for **obstacle/enemy image(s)** if applicable.
        4.  \`gemset_prompt\`: A concise, descriptive prompt for **gem/candy images** if applicable (for Match-3).
        5.  \`difficulty\`: The desired **difficulty level** ('simple', 'medium', or 'hard'). If not explicitly specified, default to 'medium'.
        6.  \`other_settings\`: An object containing any other specific numerical game parameters (like 'speed', 'gravity', 'duration', 'spawn rate') that can be extracted, mapped to their approximate numerical values for the specified difficulty or user request. If a specific parameter is mentioned (e.g., "fast speed"), use that, otherwise let the 'difficulty' guide the main parameters.

        **Ensure the output is ONLY a JSON object and nothing else.** Do NOT include any markdown (like \`\`\`json\`) or conversational text.

        Example Input: "Make the game hard with a zombie character and a haunted forest background."
        Example Output:
        {
          "character_prompt": "a zombie game character sprite, pixel art, transparent background",
          "background_prompt": "a haunted forest game background, dark, eerie",
          "obstacle_prompt": "",
          "gemset_prompt": "",
          "difficulty": "hard",
          "other_settings": {}
        }

        Example Input: "game medium and a character skull at place of mole and a scary background."
        Example Output:
        {
          "character_prompt": "a skull character sprite, game asset, transparent background",
          "background_prompt": "a scary game background, dark, eerie",
          "obstacle_prompt": "",
          "gemset_prompt": "",
          "difficulty": "medium",
          "other_settings": {}
        }

        Now, process the following user prompt for a ${gameContext}:
        "${prompt}"
        `;

    try {
        console.log('Calling Segmind LLM for prompt parsing (Claude 3 Haiku)...');
        const llmEndpoint = 'https://api.segmind.com/v1/claude-3-haiku';
        const llmResponse = await fetch(llmEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': SEGMIND_API_KEY },
            body: JSON.stringify({
                instruction: "Extract the requested game parameters and asset prompts into a JSON object as described. Do not include any other text or markdown.",
                temperature: 0.1,
                messages: [
                    {
                        role: 'user',
                        content: llmPrompt
                    }
                ]
            }),
        });

        if (!llmResponse.ok) {
            const errorData = await llmResponse.json();
            console.error('Segmind LLM (Claude 3 Haiku) Error:', errorData);
            return res.status(llmResponse.status).json({ success: false, error: `LLM processing failed: ${errorData.message || 'Unknown error'}` });
        }

        const llmData = await llmResponse.json();
        let llmOutputText = '';
        if (llmData && Array.isArray(llmData.content) && llmData.content.length > 0 && llmData.content[0].type === 'text') {
            llmOutputText = llmData.content[0].text;
        } else {
            console.error('Unexpected Claude 3 Haiku response structure. Missing expected text content:', llmData);
            return res.status(500).json({ success: false, error: 'LLM returned an unexpected response structure.' });
        }

        const jsonMatch = llmOutputText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) { llmOutputText = jsonMatch[1]; }
        
        let parsedLlmOutput;
        try {
            parsedLlmOutput = JSON.parse(llmOutputText);
        } catch (parseError) {
            console.error('Failed to parse LLM response as JSON:', llmOutputText, parseError);
            return res.status(500).json({ success: false, error: `LLM returned unparseable JSON: ${llmOutputText.substring(0, 200)}...` });
        }

        const requiredKeys = ['character_prompt', 'background_prompt', 'difficulty'];
        const hasAllKeys = requiredKeys.every(key => parsedLlmOutput.hasOwnProperty(key));
        if (!hasAllKeys) { console.warn('LLM output missing some expected keys:', parsedLlmOutput); }

        console.log('LLM successfully parsed prompt:', parsedLlmOutput);
        res.json({ success: true, data: parsedLlmOutput });

    } catch (error) {
        console.error('Server error during LLM processing:', error);
        res.status(500).json({ success: false, error: `Internal server error during LLM processing: ${error.message}` });
    }
});

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(REACT_APP_ROOT_DIR, 'build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(REACT_APP_ROOT_DIR, 'build', 'index.html'));
    });
}

const getZipAssetPath = (originalFileName, gameId, assetKeyFromFrontend) => {
    const fileName = path.basename(originalFileName);
    let targetPath = `assets/images/${fileName}`; // Default path within the game's folder in the zip

    // Adjust path based on gameId and asset type if needed, relative to the game's root directory in the zip
    // These paths must match where the game expects to find its assets.
    if (gameId === 'flappy-bird') {
        // Flappy bird images are often in assets/images/
        targetPath = `assets/images/${fileName}`;
    } else if (gameId === 'Whack-A-Mole') {
        // Whack-A-Mole background and moles often referenced from CSS/JS, but typically live in the same directory as index.html
        // For simplicity, let's put them in a dedicated 'exported_assets' folder or similar inside the game's root
        targetPath = `exported_assets/${fileName}`; 
    } else if (gameId === 'speed-runner') {
        // Speed Runner: character and background could go in 'assets', obstacles in 'assets/obstacles'
        if (assetKeyFromFrontend === 'character' || assetKeyFromFrontend === 'background') {
            targetPath = `assets/${fileName}`;
        } else if (assetKeyFromFrontend === 'obstacle') {
            targetPath = `assets/obstacles/${fileName}`;
        }
    } else if (gameId === 'simple-match-3') {
        // Simple Match-3: background might be in root, gems in 'images'
        if (assetKeyFromFrontend === 'background') {
            targetPath = `${fileName}`; // Background for simple-match-3 might be directly in root
        } else if (assetKeyFromFrontend === 'gemSet') {
            targetPath = `images/${fileName}`; // Gems for simple-match-3 typically go in 'images' folder
        }
    } else if (gameId === 'crossy-road') {
        // Crossy Road images often in 'images' folder
        targetPath = `images/${fileName}`;
    }
    return targetPath;
};


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Project Root Dir: ${PROJECT_ROOT_DIR}`);
    console.log(`React App Root Dir: ${REACT_APP_ROOT_DIR}`);
    console.log(`Games Dir: ${GAMES_DIR}`);
    console.log(`Temp Export Dir: ${TEMP_EXPORT_DIR}`);
    console.log(`Temp Uploaded AI Assets Dir: ${TEMP_ASSET_UPLOAD_DIR}`);
});