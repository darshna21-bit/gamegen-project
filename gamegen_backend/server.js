// backend/server.js

const express = require('express');
const path = require('path');
const fs = require('fs'); // Import the regular 'fs' module for createWriteStream
const fsp = require('fs/promises'); // Use fsp for promise-based file operations (like readFile, mkdir, unlink)
const cors = require('cors');
const archiver = require('archiver'); // For creating zip files

const app = express();
const PORT = 5000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // To parse JSON request bodies

// --- Directory Paths ---
const PROJECT_ROOT_DIR = path.join(__dirname, '..');
const REACT_APP_ROOT_DIR = path.join(PROJECT_ROOT_DIR, 'gamegen-ui');
const GAMES_DIR = path.join(REACT_APP_ROOT_DIR, 'public', 'games');
const AI_ASSETS_DIR = path.join(REACT_APP_ROOT_DIR, 'public', 'ai_assets');

// --- Helper Function to Determine Main Game JS File ---
// This function helps find the correct main JavaScript file within each game's folder
const getMainJsFileName = async (gameTemplateName) => {
    // IMPORTANT: Keys here MUST match the gameId sent from the frontend (e.g., 'Whack-A-Mole')
    const potentialPaths = {
        'flappy-bird': ['src/app.js'],
        'speed-runner': ['engine.js'],
        'Whack-A-Mole': ['js/script.js'], // <-- CORRECTED: Key must be 'Whack-A-Mole'
        'simple-match-3': ['script.js'],
        'crossy-road': ['js/app.js', 'js/engine.js'],
    };

    const namesToCheck = potentialPaths[gameTemplateName];

    if (namesToCheck) {
        for (const name of namesToCheck) {
            // gameTemplateName here will be 'Whack-A-Mole', so path.join will correctly use it
            const filePath = path.join(GAMES_DIR, gameTemplateName, name);
            try {
                await fsp.access(filePath); // Check if file exists
                console.log(`Found main JS file for ${gameTemplateName}: ${name}`);
                return name; // Return the path relative to the game folder
            } catch (e) {
                // File doesn't exist, try next name
            }
        }
    }
    console.warn(`Could not find main JS file for ${gameTemplateName}. Tried: ${namesToCheck ? namesToCheck.join(', ') : 'none'}`);
    return null; // No main JS file found or game template not defined
};


// --- JavaScript Variable to Asset Path/Parameter Mapping ---
// IMPORTANT: Keys here MUST match the gameId sent from the frontend (e.g., 'Whack-A-Mole')
const jsVariableToAssetPathMapping = {
    'flappy-bird': {
        gravity: 'GRAVITY',
        pipeGap: 'PIPE_GAP',
        speed: 'PIPE_BASE_SPEED',
        character: 'NOT_A_DIRECT_VAR_SPECIAL_CASE_BIRD_IMAGE', // Special handling in export route
        obstacle: 'currentPipeImageUrl', // Refers to 'this.#currentPipeImageUrl'
        background: 'currentBackgroundImageUrl', // Refers to 'this.#currentBackgroundImageUrl'
    },
    'Whack-A-Mole': { // <-- CORRECTED: Key must be 'Whack-A-Mole'
        moleSpawnRate: 'velocity_level',
        gameDuration: 'time_level',
        moleCharacter: 'currentMoleImageUrl',
        ground: 'currentGroundImageUrl',
        // IMPORTANT: Add 'hammer' asset type if it's being generated/used
        // hammer: 'hammerImageUrl', // Assuming a variable in script.js to change hammer
    },
    'speed-runner': {
        playerSpeedX: 'appInitialBlockSpeed',
        obstacleSpawnDelay: 'appObstacleSpawnIntervalMs',
        character: 'appMainCharacterImageUrls', // Array of URLs
        background: 'appBackgroundImageUrl',
        obstacle: 'appObstacleImageUrls', // Array of URLs
    },
    'simple-match-3': {
        rows: 'rows',
        columns: 'columns',
        scorePerMatch: 'scorePerMatch',
        gameDuration: 'gameDuration',
        // 'background' and 'gemSet' are handled dynamically by script.js's message listener,
        // so no direct variable replacement is needed here. Files are still copied to ZIP.
    },
    'crossy-road': {
        // These target properties within the `window.gameSettings` object in js/app.js
        obstacleSpeed: 'obstacleSpeed', // Property of window.gameSettings
        trafficDensity: 'trafficDensity', // Property of window.gameSettings
        playerMoveDelay: 'playerMoveDelay', // Property of window.gameSettings
        gameDuration: 'gameDuration', // Property of window.gameSettings
        character: 'playerSpriteUrl', // Property of window.gameSettings
        obstacle: 'enemySpriteUrl', // Property of window.gameSettings
    },
};


// --- API Route for Game Export ---
app.post('/api/export/:gameId', async (req, res) => {
    const { gameId } = req.params; 
    const { gameParameters, aiAssetPaths, userSessionId } = req.body;

    if (!gameId || !gameParameters || !aiAssetPaths || !userSessionId) {
        return res.status(400).json({ success: false, message: 'Missing required export data.' });
    }

    const gameSourcePath = path.join(GAMES_DIR, gameId); 
    const outputZipPath = path.join(__dirname, 'temp', `${gameId}_${userSessionId}_custom_game.zip`);
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } }); // Set compression level

    // Ensure 'temp' directory exists
    await fsp.mkdir(path.join(__dirname, 'temp'), { recursive: true });

    output.on('close', () => {
        console.log(`ZIP created: ${archive.pointer()} total bytes`);
        res.download(outputZipPath, `${gameId}_custom_game.zip`, async (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ success: false, message: 'Failed to send zip file.' });
            } else {
                console.log('Zip file sent successfully.');
                // Clean up the temporary zip file after sending
                try {
                    await fsp.unlink(outputZipPath);
                    console.log('Temporary zip file deleted.');
                } catch (cleanupErr) {
                    console.error('Error deleting temporary zip file:', cleanupErr);
                }
            }
        });
    });

    archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
            console.warn('Archiver warning:', err);
        } else {
            throw err;
        }
    });

    archive.on('error', (err) => {
        console.error('Archiver error:', err);
        res.status(500).json({ success: false, message: `Archiving failed: ${err.message}` });
    });

    archive.pipe(output);

    try {
        // --- MODIFIED: Explicitly add individual files instead of archive.directory ---
        // This gives us more control and avoids potential conflicts.

        // Get a list of all files in the gameSourcePath and its subdirectories
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

        // Resolve mainJsFileName once to avoid repeated async calls in the loop
        const resolvedMainJsFileName = await getMainJsFileName(gameId);

        // Add each original file to the archive, maintaining its relative path
        for (const filePath of allOriginalGameFiles) {
            const relativePath = path.relative(gameSourcePath, filePath);
            // Normalize relativePath to use forward slashes for consistent comparison and archive name
            const normalizedRelativePath = relativePath.replace(/\\/g, '/'); // Convert backslashes to forward slashes

            console.log(`Processing original file: ${normalizedRelativePath}. Main JS file to skip: ${resolvedMainJsFileName}`); // ADDED LOG
            // Skip the main JS file for now, as we'll add its modified version later
            if (normalizedRelativePath !== resolvedMainJsFileName) { // Use normalized path for comparison
                console.log(`Adding original file to archive: ${normalizedRelativePath}`); // ADDED LOG
                archive.file(filePath, { name: normalizedRelativePath }); // Use normalized path for archive name
            } else {
                console.log(`Skipping original main JS file: ${normalizedRelativePath} (will add modified version later)`); // ADDED LOG
            }
        }
        // --- END MODIFIED SECTION ---

        // 2. Identify and modify the main JavaScript file
        const mainJsFileName = await getMainJsFileName(gameId); 
        if (mainJsFileName) {
            const mainJsFilePath = path.join(gameSourcePath, mainJsFileName);
            let jsCode = await fsp.readFile(mainJsFilePath, 'utf8');

            console.log(`Modifying ${mainJsFileName} for ${gameId}...`);

            const mappings = jsVariableToAssetPathMapping[gameId]; 

            if (mappings) {
                // --- SPECIAL HANDLING FOR CROSSY ROAD'S window.gameSettings OBJECT ---
                if (gameId === 'crossy-road' && mainJsFileName === 'js/app.js') {
                    // ... existing Crossy Road logic ...
                } else {
                    // --- GENERAL HANDLING FOR OTHER GAMES (including Whack-A-Mole) ---
                    // Apply parameter changes
                    for (const paramKey in gameParameters) {
                        if (mappings[paramKey]) {
                            const jsVarName = mappings[paramKey]; 
                            const newValue = gameParameters[paramKey];

                            // Regex to match variable declaration and its value up to newline
                            const paramReplacementRegex = new RegExp(
                                `((?:const|let|var)\\s+${jsVarName}\\s*=|this\\.#${jsVarName}\\s*=)[^\\n]*`, 'g'
                            );

                            if (jsCode.match(paramReplacementRegex)) {
                                jsCode = jsCode.replace(paramReplacementRegex, `$1 ${newValue};`);
                                console.log(`- Replaced parameter: ${jsVarName} with ${newValue}`);
                            } else {
                                console.warn(`- Parameter variable "${jsVarName}" not found or regex did not match in ${mainJsFileName}.`);
                            }
                        } else {
                            console.warn(`- No mapping found for frontend parameter key "${paramKey}" in server.js for game "${gameId}".`);
                        }
                    }

                    // Apply AI asset path changes (only for assets directly initialized in JS file)
                    for (const assetType in aiAssetPaths) {
                        if (mappings[assetType]) {
                            const jsVarName = mappings[assetType]; 
                            const aiAssetData = aiAssetPaths[assetType];

                            let replacementValue = '';
                            if (typeof aiAssetData === 'string') {
                                replacementValue = `'${getZipAssetPath(aiAssetData, gameId, assetType)}'`;
                            } else if (typeof aiAssetData === 'object' && aiAssetData !== null) {
                                if (aiAssetData.urls && Array.isArray(aiAssetData.urls)) {
                                    const newUrlsInZip = aiAssetData.urls.map(url => `'${getZipAssetPath(url, gameId, assetType)}'`);
                                    replacementValue = `[${newUrlsInZip.join(', ')}]`;
                                } else if (aiAssetData.prefix && aiAssetData.frameCount) {
                                    const sampleFrameUrl = aiAssetData.prefix.replace(/\/?$/, '') + '_00.png';
                                    const newPrefixInZip = path.dirname(getZipAssetPath(sampleFrameUrl, gameId, assetType)).replace(/\\/g, '/') + '/';
                                    replacementValue = `{ prefix: '${newPrefixInZip}', frameCount: ${aiAssetData.frameCount}, frameWidth: ${aiAssetData.frameWidth || 'null'}, frameHeight: ${aiAssetData.frameHeight || 'null'} }`;
                                } else {
                                     console.warn(`Unknown AI asset data structure for ${assetType}. Skipping replacement.`);
                                     continue;
                                }
                            } else {
                                console.warn(`Invalid AI asset data type for ${assetType}. Skipping replacement.`);
                                continue;
                            }

                            // Regex to match variable declaration and its value up to newline
                            const assetReplacementRegex = new RegExp(
                                `((?:const|let|var)\\s+${jsVarName}\\s*=|this\\.#${jsVarName}\\s*=)[^\\n]*`, 'g'
                            );

                            // --- SPECIAL CASE: Flappy Bird character image is a direct literal in a method call ---
                            if (jsVarName === 'NOT_A_DIRECT_VAR_SPECIAL_CASE_BIRD_IMAGE' && gameId === 'flappy-bird') {
                                // This regex specifically targets the `setImage` call for Flappy Bird's bird image.
                                // It replaces the entire URL string within that specific method call.
                                const birdImageLiteralRegex = /this\.#bird\.setImage\(\{\s*url:\s*['"]assets\/images\/yellowbird-midflap\.png['"],/g;
                                if (jsCode.match(birdImageLiteralRegex)) {
                                    jsCode = jsCode.replace(birdImageLiteralRegex, `this.#bird.setImage({ url: ${replacementValue},`);
                                    console.log(`- Directly replaced Flappy Bird character image literal.`);
                                } else {
                                    console.warn("Flappy Bird character image literal not found for direct replacement.");
                                }
                            } else if (jsCode.match(assetReplacementRegex)) {
                                jsCode = jsCode.replace(assetReplacementRegex, `$1 ${replacementValue};`);
                                console.log(`- Replaced asset: ${jsVarName} with ${replacementValue}`);
                            } else {
                                console.warn(`- Asset variable "${jsVarName}" not found or regex did not match in ${mainJsFileName}.`);
                            }
                        } else {
                             console.log(`- Asset type "${assetType}" for game "${gameId}" does not have a direct variable mapping for replacement. Skipping code modification.`);
                        }
                    }
                }
            } else {
                console.warn(`No mappings defined for gameId: ${gameId} in jsVariableToAssetPathMapping.`);
            }

            // --- ADDED DEBUG LOG: Log the modified JS code before appending ---
            console.log(`--- START MODIFIED ${mainJsFileName} CONTENT ---`);
            console.log(jsCode);
            console.log(`--- END MODIFIED ${mainJsFileName} CONTENT ---`);

            // Add the modified JS file to the archive, overwriting the original
            // The 'name' option ensures it goes to the correct relative path in the zip
            archive.append(jsCode, { name: mainJsFileName });
            console.log(`Added modified ${mainJsFileName} to archive.`);
        } else {
            console.warn(`Skipping JS modification: Main JS file not found for ${gameId}.`);
        }

        // 3. Add AI-generated assets to the zip in their appropriate locations
        for (const assetType in aiAssetPaths) {
            const aiAssetData = aiAssetPaths[assetType];

            let assetsToInclude = [];

            if (typeof aiAssetData === 'string') {
                assetsToInclude.push({ url: aiAssetData, originalType: 'single' });
            } else if (typeof aiAssetData === 'object' && aiAssetData !== null) {
                if (aiAssetData.urls && Array.isArray(aiAssetData.urls)) {
                    aiAssetData.urls.forEach(url => assetsToInclude.push({ url: url, originalType: 'array' }));
                    // If it's an array of URLs, we need to ensure the target zip path is relative to the game's root
                    // This assumes the game's JS expects a relative path for array elements.
                } else if (aiAssetData.prefix && aiAssetData.frameCount) {
                    for (let i = 0; i < aiAssetData.frameCount; i++) {
                        const frameFileName = aiAssetData.prefix.replace(/\/?$/, '') + '_' + String(i).padStart(2, '0') + '.png';
                        assetsToInclude.push({ url: frameFileName, originalType: 'animation' });
                    }
                }
            }

            for (const asset of assetsToInclude) {
                const aiAssetServerPath = path.join(REACT_APP_ROOT_DIR, 'public', asset.url);
                const targetZipPath = getZipAssetPath(asset.url, gameId, assetType);

                try {
                    console.log(`Adding AI asset: ${asset.url} to ZIP at ${targetZipPath}`);
                    archive.file(aiAssetServerPath, { name: targetZipPath });
                } catch (readErr) {
                    console.error(`Error reading AI asset file ${aiAssetServerPath}:`, readErr);
                }
            }
        }

        archive.finalize();

    } catch (error) {
        console.error('Error during game export processing:', error);
        res.status(500).json({ success: false, message: `Server error during export: ${error.message}` });
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
const getZipAssetPath = (originalServerUrl, gameId, assetKeyFromFrontend) => {
    const fileName = path.basename(originalServerUrl);
    let targetPath = `assets/images/${fileName}`; // Default fallback

    if (gameId === 'flappy-bird') {
        targetPath = `assets/images/${fileName}`;
    } else if (gameId === 'Whack-A-Mole') { // <-- CORRECTED: Key must be 'Whack-A-Mole'
        if (assetKeyFromFrontend === 'moleCharacter' || assetKeyFromFrontend === 'ground') {
            targetPath = `css/${fileName}`; // Whack-A-Mole refers to images in its CSS
        }
        // If 'hammer' is an assetType and it should go into 'assets/' folder in the ZIP:
        // else if (assetKeyFromFrontend === 'hammer') {
        //     targetPath = `assets/${fileName}`;
        // }
    } else if (gameId === 'speed-runner') {
        if (assetKeyFromFrontend === 'character' || assetKeyFromFrontend === 'background') {
            targetPath = `assets/${fileName}`;
        } else if (assetKeyFromFrontend === 'obstacle') {
            targetPath = `assets/obstacles/${fileName}`;
        }
    } else if (gameId === 'simple-match-3') {
        if (assetKeyFromFrontend === 'background') {
            targetPath = `${fileName}`; // Placed directly in the root of the game folder
        } else if (assetKeyFromFrontend === 'gemSet') {
            targetPath = `images/${fileName}`;
        }
    } else if (gameId === 'crossy-road') {
        // Crossy Road assets are in the 'images/' folder relative to index.html
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
