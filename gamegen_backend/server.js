// backend/server.js

require('dotenv').config(); // MUST be at the very top to load .env variables

const express = require('express');
const path = require('path');
const fs = require('fs'); // Import the regular 'fs' module for createWriteStream
const fsp = require('fs/promises'); // Use fsp for promise-based file operations (like readFile, mkdir, unlink)
const cors = require('cors');
const archiver = require('archiver'); // For creating zip files
const fetch = require('node-fetch').default; // <-- CORRECTED: ADD .default HERE

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
const AI_ASSETS_DIR = path.join(REACT_APP_ROOT_DIR, 'public', 'ai_assets'); // Used for temporary storage for export

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
        character: 'NOT_A_DIRECT_VAR_SPECIAL_CASE_BIRD_IMAGE',
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
    },
    'crossy-road': {
        obstacleSpeed: 'obstacleSpeed', trafficDensity: 'trafficDensity', playerMoveDelay: 'playerMoveDelay', gameDuration: 'gameDuration',
        character: 'playerSpriteUrl', obstacle: 'enemySpriteUrl',
    },
};

// API Route for Game Export (UNCHANGED from your provided code, as it correctly uses aiAssetPaths from frontend state)
app.post('/api/export/:gameId', async (req, res) => {
    const { gameId } = req.params;
    const { gameParameters, aiAssetPaths, userSessionId } = req.body;

    if (!gameId || !gameParameters || !aiAssetPaths || !userSessionId) {
        return res.status(400).json({ success: false, message: 'Missing required export data.' });
    }

    const gameSourcePath = path.join(GAMES_DIR, gameId);
    const outputZipPath = path.join(__dirname, 'temp', `${gameId}_${userSessionId}_custom_game.zip`);
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await fsp.mkdir(path.join(__dirname, 'temp'), { recursive: true });
    await fsp.mkdir(AI_ASSETS_DIR, { recursive: true });

    output.on('close', () => {
        console.log(`ZIP created: ${archive.pointer()} total bytes`);
        res.download(outputZipPath, `${gameId}_custom_game.zip`, async (err) => {
            if (err) { console.error('Error sending file:', err); res.status(500).json({ success: false, message: 'Failed to send zip file.' }); }
            else {
                console.log('Zip file sent successfully.');
                try { await fsp.unlink(outputZipPath); console.log('Temporary zip file deleted.'); }
                catch (cleanupErr) { console.error('Error deleting temporary zip file:', cleanupErr); }
            }
        });
    });

    archive.on('warning', (err) => { if (err.code === 'ENOENT') { console.warn('Archiver warning:', err); } else { throw err; } });
    archive.on('error', (err) => { console.error('Archiver error:', err); res.status(500).json({ success: false, message: `Archiving failed: ${err.message}` }); });

    archive.pipe(output);

    try {
        const getFiles = async (dir) => {
            const dirents = await fsp.readdir(dir, { withFileTypes: true });
            const files = await Promise.all(dirents.map((dirent) => {
                const res = path.resolve(dir, dirent.name);
                return dirent.isDirectory() ? getFiles(res) : res;
            }));
            return Array.prototype.concat(...files);
        };

        const allOriginalGameFiles = await getFiles(gameSourcePath);
        console.log(`Found ${allOriginalGameFiles.length} original game files.`);
        const resolvedMainJsFileName = await getMainJsFileName(gameId);

        for (const filePath of allOriginalGameFiles) {
            const relativePath = path.relative(gameSourcePath, filePath);
            const normalizedRelativePath = relativePath.replace(/\\/g, '/');
            if (normalizedRelativePath !== resolvedMainJsFileName) {
                archive.file(filePath, { name: normalizedRelativePath });
            }
        }

        const mainJsFileName = await getMainJsFileName(gameId);
        if (mainJsFileName) {
            const mainJsFilePath = path.join(gameSourcePath, mainJsFileName);
            let jsCode = await fsp.readFile(mainJsFilePath, 'utf8');

            console.log(`Modifying ${mainJsFileName} for ${gameId}...`);
            const mappings = jsVariableToAssetPathMapping[gameId];

            if (mappings) {
                if (gameId === 'crossy-road' && mainJsFileName === 'js/app.js') {
                    // This is your original Crossy Road specific export logic if any.
                    // Keep it here or modify if needed to integrate AI asset paths.
                    // For now, it's left as is from your provided file.
                    // This block might need review later for AI asset export for Crossy Road.
                } else {
                    for (const paramKey in gameParameters) {
                        if (mappings[paramKey]) {
                            const jsVarName = mappings[paramKey];
                            const newValue = gameParameters[paramKey];
                            const paramReplacementRegex = new RegExp(`((?:const|let|var)\\s+${jsVarName}\\s*=|this\\.#${jsVarName}\\s*=)[^\\n]*`, 'g');
                            if (jsCode.match(paramReplacementRegex)) { jsCode = jsCode.replace(paramReplacementRegex, `$1 ${newValue};`); }
                        }
                    }

                    // --- MODIFIED EXPORT LOGIC FOR AI ASSETS ---
                    for (const assetType in aiAssetPaths) {
                        const aiAssetDataFromFrontend = aiAssetPaths[assetType];

                        if (typeof aiAssetDataFromFrontend === 'string' && aiAssetDataFromFrontend.startsWith('data:image/')) {
                            // This handles single Base64 image assets (character, background, obstacle etc.)
                            const base64Content = aiAssetDataFromFrontend.split(',')[1];
                            const mimeType = aiAssetDataFromFrontend.split(',')[0].split(':')[1].split(';')[0];
                            const fileExtension = mimeType.split('/')[1] || 'png';

                            const tempFileName = `${gameId}_${assetType}_${Date.now()}.${fileExtension}`;
                            const tempFilePath = path.join(AI_ASSETS_DIR, tempFileName);

                            await fsp.writeFile(tempFilePath, base64Content, { encoding: 'base64' });
                            console.log(`Saved temporary AI asset for export: ${tempFilePath}`);

                            const jsVarName = mappings[assetType];
                            const assetPathInZip = getZipAssetPath(tempFileName, gameId, assetType);
                            const replacementValue = `'${assetPathInZip}'`;

                            const assetReplacementRegex = new RegExp(
                                `((?:const|let|var)\\s+${jsVarName}\\s*=|this\\.#${jsVarName}\\s*=)[^\\n]*`, 'g'
                            );

                            if (jsVarName === 'NOT_A_DIRECT_VAR_SPECIAL_CASE_BIRD_IMAGE' && gameId === 'flappy-bird') {
                                const birdImageLiteralRegex = /this\.#bird\.setImage\(\{\s*url:\s*['"]assets\/images\/yellowbird-midflap\.png['"],/g;
                                if (jsCode.match(birdImageLiteralRegex)) { jsCode = jsCode.replace(birdImageLiteralRegex, `this.#bird.setImage({ url: ${replacementValue},`); }
                            } else if (jsCode.match(assetReplacementRegex)) {
                                jsCode = jsCode.replace(assetReplacementRegex, `$1 ${replacementValue};`);
                            } else {
                                console.warn(`- Asset variable "${jsVarName}" not found or regex did not match in ${mainJsFileName}. For assetType: ${assetType}.`);
                            }

                            archive.file(tempFilePath, { name: assetPathInZip });
                            await fsp.unlink(tempFilePath);
                            console.log(`Added and deleted temporary AI asset: ${tempFilePath}`);

                        } else if (typeof aiAssetDataFromFrontend === 'object' && aiAssetDataFromFrontend !== null && aiAssetDataFromFrontend.urls && Array.isArray(aiAssetDataFromFrontend.urls)) {
                            // This handles array of Base64 image assets (like gemSet)
                            console.log(`Processing array of AI assets for export: ${assetType}`);
                            const jsVarName = mappings[assetType];
                            const newUrlsInZip = [];

                            for (const [index, dataUrl] of aiAssetDataFromFrontend.urls.entries()) {
                                const base64Content = dataUrl.split(',')[1];
                                const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
                                const fileExtension = mimeType.split('/')[1] || 'png';

                                const tempFileName = `${gameId}_${assetType}_${index}_${Date.now()}.${fileExtension}`;
                                const tempFilePath = path.join(AI_ASSETS_DIR, tempFileName);

                                await fsp.writeFile(tempFilePath, base64Content, { encoding: 'base64' });
                                console.log(`Saved temporary AI array asset for export: ${tempFilePath}`);

                                const assetPathInZip = getZipAssetPath(tempFileName, gameId, assetType);
                                newUrlsInZip.push(assetPathInZip);

                                archive.file(tempFilePath, { name: assetPathInZip });
                                await fsp.unlink(tempFilePath);
                                console.log(`Added and deleted temporary AI array asset: ${tempFilePath}`);
                            }

                            // Replace variable with an array of strings
                            const replacementValue = `[${newUrlsInZip.map(u => `'${u}'`).join(', ')}]`;
                            const assetReplacementRegex = new RegExp(
                                `((?:const|let|var)\\s+${jsVarName}\\s*=|this\\.#${jsVarName}\\s*=)[^\\n]*`, 'g'
                            );
                            if (jsCode.match(assetReplacementRegex)) {
                                jsCode = jsCode.replace(assetReplacementRegex, `$1 ${replacementValue};`);
                                console.log(`Replaced variable ${jsVarName} with array of paths: ${replacementValue}`);
                            } else {
                                console.warn(`- Array asset variable "${jsVarName}" not found or regex did not match in ${mainJsFileName}. For assetType: ${assetType}.`);
                            }
                        } else {
                            console.warn(`Unrecognized AI asset data type for export: ${assetType}. Skipping.`);
                        }
                    }
                }
            } else {
                console.warn(`No mappings defined for gameId: ${gameId} in jsVariableToAssetPathMapping.`);
            }

            console.log(`--- START MODIFIED ${mainJsFileName} CONTENT ---`);
            console.log(jsCode);
            console.log(`--- END MODIFIED ${mainJsFileName} CONTENT ---`);

            archive.append(jsCode, { name: mainJsFileName });
            console.log(`Added modified ${mainJsFileName} to archive.`);
        } else {
            console.warn(`Skipping JS modification: Main JS file not found for ${gameId}.`);
        }

        archive.finalize();

    } catch (error) {
        console.error('Error during game export processing:', error);
        res.status(500).json({ success: false, message: `Server error during export: ${error.message}` });
    }
});


// --- Segmind AI Image Generation Route (/api/generate-asset) ---
// This route acts as a proxy to Segmind's text-to-image and background removal APIs.
app.post('/api/generate-asset', async (req, res) => {
    const { prompt, assetType } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }
    if (!SEGMIND_API_KEY) {
        console.error('SEGMIND_API_KEY is not set in backend .env');
        return res.status(500).json({ success: false, error: 'Server configuration error: API key missing.' });
    }

    // --- MODIFIED BLOCK FOR GEMSET GENERATION ---
    if (assetType === 'gemSet') {
        try {
            const numGems = 6; // We need 6 distinct gems for Simple Match-3
            const gemImageUrls = [];
            console.log(`%c[Backend]: Generating ${numGems} gem images for prompt: "${prompt}"`, 'color: yellow;');

            for (let i = 0; i < numGems; i++) {
                // Ensure distinct prompts for each gem
                const gemPrompt = `${prompt} - gem ${i + 1}, unique, distinct, transparent background, cartoon style, highly detailed, game icon, no numbers or letters`;
                const textToImagePayload = {
                    prompt: gemPrompt,
                    width: 256, // Smaller size is usually fine for gems
                    height: 256,
                    samples: 1,
                    scheduler: 'UniPC',
                    num_inference_steps: 25,
                    negative_prompt: "(worst quality, low quality, blurred, text, watermark, writing, ugly, deformed, disfigured)",
                    guidance_scale: 9,
                    seed: Math.floor(Math.random() * 1000000) + i, // Vary seed for distinct outputs
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

                // Apply background removal to each gem
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

                gemImageUrls.push(`data:image/png;base64,${transparentImage}`); // Store with data URI prefix
            }

            // --- ADDED CONSOLE.LOG HERE TO DEBUG GEMSET ARRAY ---
            console.log(`%c[Backend DEBUG - FINAL GEMSET]: Sending ${gemImageUrls.length} gem URLs to frontend. Checking uniqueness:`, 'color: yellow;');
            gemImageUrls.forEach((url, index) => {
                console.log(`%c[Backend DEBUG] Gem ${index}: ${url.substring(0, 50)}... (Length: ${url.length})`, 'color: yellow;');
            });
            // --- END OF CONSOLE.LOG ADDITION ---

            // Send all generated gem images as an array of URLs
            res.json({ success: true, urls: gemImageUrls }); // Send 'urls' array
            return; // Important: return after sending response for gemSet
        } catch (error) {
            console.error('%c[Backend]: Error generating gemSet assets:', 'color: red;', error);
            return res.status(500).json({ success: false, error: `Failed to generate gem set: ${error.message}` });
        }
    }

    // --- Original logic for other single-image asset types (character, background, obstacle) ---
    const textToImageEndpoint = 'https://api.segmind.com/v1/segmind-vega';
    let basePromptSuffix = '';
    let width = 768; // Default dimensions for general assets
    let height = 768;

    // Customize prompt and dimensions based on the asset type requested by the frontend
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
    } else { // Fallback for any other type, or if a specific prompt is not needed
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
            res.json({ success: true, image: base64Image }); // Send single image in 'image' field
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
        // console.log(`[Backend Debug]: RAW BASE64 SENT (from ArrayBuffer conversion): ${transparentImage.substring(0, 100)}... (Length: ${transparentImage.length})`);

        if (!transparentImage) { return res.status(500).json({ success: false, error: 'No transparent image data received.' }); }

        res.json({ success: true, image: transparentImage }); // Send single image in 'image' field

    } catch (error) {
        console.error('%cServer error during asset generation:', 'color: red;', error);
        res.status(500).json({ success: false, error: `Internal server error during asset generation: ${error.message}` });
    }
});

// --- Segmind LLM Text Generation Route ---
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
        Analyze the following user prompt and extract the requested details.

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
        // --- UPDATED Segmind Endpoint for LLM (Claude 3 Haiku) ---
        const llmEndpoint = 'https://api.segmind.com/v1/claude-3-haiku';
        const llmResponse = await fetch(llmEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': SEGMIND_API_KEY },
            body: JSON.stringify({
                // Claude 3 Haiku payload structure based on your provided snippet
                instruction: "Extract the requested game parameters and asset prompts into a JSON object as described. Do not include any other text or markdown.",
                temperature: 0.1, // Adjust as needed
                messages: [
                    {
                        role: 'user',
                        content: llmPrompt // Send the generated prompt here
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
        // Removed: console.log('Raw LLM Data from Claude 3 Haiku:', JSON.stringify(llmData, null, 2)); // Debugging line, can be removed

        // --- FIX APPLIED HERE: Correctly access the LLM's text output ---
        let llmOutputText = '';
        if (llmData && Array.isArray(llmData.content) && llmData.content.length > 0 && llmData.content[0].type === 'text') {
            llmOutputText = llmData.content[0].text;
        } else {
            console.error('Unexpected Claude 3 Haiku response structure. Missing expected text content:', llmData);
            return res.status(500).json({ success: false, error: 'LLM returned an unexpected response structure.' });
        }
        // --- END FIX ---

        // Attempt to extract JSON from the string, even if it has markdown
        // This is good practice as LLMs can sometimes wrap JSON in ```json```
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

// Serve static React build files in production (optional, if backend also serves frontend)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(REACT_APP_ROOT_DIR, 'build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(REACT_APP_ROOT_DIR, 'build', 'index.html'));
    });
}

// --- Utility function to determine where the asset should go inside the ZIP ---
const getZipAssetPath = (originalFileName, gameId, assetKeyFromFrontend) => {
    const fileName = path.basename(originalFileName);
    let targetPath = `assets/images/${fileName}`;

    if (gameId === 'flappy-bird') {
        targetPath = `assets/images/${fileName}`;
    } else if (gameId === 'Whack-A-Mole') {
        if (assetKeyFromFrontend === 'moleCharacter' || assetKeyFromFrontend === 'ground') {
            targetPath = `css/${fileName}`;
        }
    } else if (gameId === 'speed-runner') {
        if (assetKeyFromFrontend === 'character' || assetKeyFromFrontend === 'background') {
            targetPath = `assets/${fileName}`;
        } else if (assetKeyFromFrontend === 'obstacle') {
            targetPath = `assets/obstacles/${fileName}`;
        }
    } else if (gameId === 'simple-match-3') {
        if (assetKeyFromFrontend === 'background') {
            targetPath = `${fileName}`; // Background for simple-match-3 goes directly in root
        } else if (assetKeyFromFrontend === 'gemSet') {
            targetPath = `images/${fileName}`; // Gems for simple-match-3 go in 'images' folder
        }
    } else if (gameId === 'crossy-road') {
        targetPath = `images/${fileName}`;
    }
    return targetPath;
};

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Project Root Dir: ${PROJECT_ROOT_DIR}`);
    console.log(`React App Root Dir: ${REACT_APP_ROOT_DIR}`);
    console.log(`Games Dir: ${GAMES_DIR}`);
    console.log(`AI Assets Dir: ${AI_ASSETS_DIR}`);
});