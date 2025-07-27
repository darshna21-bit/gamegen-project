// --- NEW: Global variables to store parameters received from the React app ---
// These will act as the 'base' values for the game's dynamic variables.
let appInitialBlockSpeed = 10; // Corresponds to React's 'playerSpeedX'
let appObstacleSpawnIntervalMs = 1000; // Corresponds to React's 'obstacleSpawnDelay'
// Note: 'obstacleSpeedY' and 'jumpForce' parameters from React config are not directly
// applicable to this game's mechanics as currently written. They will be received
// but not used to change specific game behavior in this implementation.

// --- MODIFIED LINE: appMainCharacterImageUrl changed to an array to hold multiple URLs
// This now allows flexibility for future animated characters, but for now, we'll use the first. ---
let appMainCharacterImageUrls = ['./assets/images/ships/ship1.png']; // Default path from React config (corrected to match index.html)

let appBackgroundImageUrl = './assets/background.png'; // Default path from React config

// --- NEW LINE: Global array to hold obstacle image URLs received from the React app ---
let appObstacleImageUrls = []; // This will be populated by AI-generated image URLs

//Images - These are your fallback/default blob images if no AI images are provided
const blob1 = "./assets/images/blobs/blob1.png"
const blob2 = "./assets/images/blobs/blob2.png"
const blob3 = "./assets/images/blobs/blob3.png"
const blob4 = "./assets/images/blobs/blob4.png"
const blob5 = "./assets/images/blobs/blob5.png"
const blobImages = [blob1, blob2, blob3, blob4, blob5]

//Elements
const playerObject = document.getElementById("playerObject")
// NEW: Get reference to the inner <img> tag
const playerShipImage = document.getElementById("playerShip"); 
const gameArea = document.getElementById("gameArea")
const pauseBanner = document.getElementById("pauseBanner")
const pauseBtn = document.getElementById("pauseBtn")
const resultBanner = document.getElementById("resultBanner")
const resultBannerCurrent = document.getElementById("resultBannerCurrent")
const resultBannerHigh = document.getElementById("resultBannerHigh")
const scoreBoard = document.getElementById("scoreBoard")

//Colors
var color = {
    lightShade: "#6E85B2",
    mediumLightShade: "#5C527F",
    mediumDarkShade: "#3E2C41",
    darkShade: "#261C2C",
}

//Default Window Values
const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;
const topLane = 60
const middleLane = 260
const bottomLane = 460

//Default Gameplay Values
let blockSpeed = 10;
const accel = 0.1;
let playerPos = middleLane
let gameStates = {Active: "Active", Paused: "Paused", Over: "Over"}
let currentGameState = gameStates.Active
let blockList = [];
let playerScore = 1;

//Gameplay Values
const nitro = 0
let playerStates = {Normal: "Normal", Boosting: "Boosting", Stuck: "Stuck"}
let currentPlayerState = playerStates.Normal;
// --- NEW: Interval IDs for clearing/re-setting ---
let blockSpawnIntervalId;
let blockMotorIntervalId;
let updateScoreIntervalId;

// --- NEW: Function to apply current game parameters and restart intervals ---
function applyGameParameters() {
    console.log("[Speed Runner Debug]: applyGameParameters called.");
    // Apply initial game speed
    blockSpeed = appInitialBlockSpeed;

    // Apply main character image(s) - using the first available image
    if (playerObject) {
        console.log("[Speed Runner Debug]: playerObject found.");
        const playerImageUrl = appMainCharacterImageUrls.length > 0 ? appMainCharacterImageUrls[0] : './assets/images/ships/ship1.png'; // Corrected default path
        playerObject.style.backgroundImage = `url(${playerImageUrl})`;
        playerObject.style.backgroundSize = 'contain';
        playerObject.style.backgroundRepeat = 'no-repeat';
        playerObject.style.backgroundPosition = 'center';

        // --- NEW/MODIFIED: Ensure playerObject has fixed dimensions ---
        // Match the dimensions of the default playerShip image
        playerObject.style.width = '60px'; // From .playerShip in style.css
        playerObject.style.height = '80px'; // From .playerShip in style.css
        console.log(`[Speed Runner Debug]: playerObject dimensions set to ${playerObject.style.width}x${playerObject.style.height}.`);

        // --- NEW: Hide the inner <img> tag if an AI image is applied to the parent div ---
        if (playerShipImage) {
            console.log("[Speed Runner Debug]: playerShipImage found.");
            if (playerImageUrl !== './assets/images/ships/ship1.png') { // If it's an AI image (not the default path)
                playerShipImage.style.display = 'none'; // Hide the original <img>
                console.log("[Speed Runner Debug]: Hiding playerShipImage (default img).");
            } else {
                playerShipImage.style.display = 'block'; // Show original <img> for default
                playerObject.style.backgroundImage = 'none'; // Clear background if using default <img>
                console.log("[Speed Runner Debug]: Showing playerShipImage (default img), clearing playerObject background.");
            }
        } else {
            console.warn("[Speed Runner Debug]: playerShipImage (inner <img>) NOT found!");
        }
    } else {
        console.warn("[Speed Runner Debug]: playerObject (player div) NOT found!");
    }

    // Apply background image
    if (gameArea) {
        console.log("[Speed Runner Debug]: gameArea found.");
        gameArea.style.backgroundImage = `url(${appBackgroundImageUrl})`;
        gameArea.style.backgroundSize = 'cover';
        gameArea.style.backgroundRepeat = 'no-repeat';
        gameArea.style.backgroundPosition = 'center';
        console.log(`[Speed Runner Debug]: gameArea background set to: ${gameArea.style.backgroundImage}`);
    } else {
        console.warn("[Speed Runner Debug]: gameArea NOT found!");
    }

    // Clear and restart block spawning interval with new delay
    clearInterval(blockSpawnIntervalId);
    blockSpawnIntervalId = setInterval(() => { spawnBlock() }, appObstacleSpawnIntervalMs);

    // Ensure other intervals are running if game is active
    if (currentGameState === gameStates.Active) {
        clearInterval(blockMotorIntervalId);
        blockMotorIntervalId = setInterval(() => moveBlock(), 20); // Original speed
        clearInterval(updateScoreIntervalId);
        updateScoreIntervalId = setInterval(() => updateScore(), 100); // Original speed
    }
    console.log(`[Speed Runner Game]: Applied parameters - Initial Speed: ${appInitialBlockSpeed}, Spawn Delay: ${appObstacleSpawnIntervalMs}`);
}

function startGame() {
    playerPos = middleLane;
    playerObject.style.top = `${playerPos}px`;
    playerObject.style.opacity = "1"
    playerScore = 1;
    currentPlayerState = playerStates.Normal;
    resultBanner.style.left = "100vw";
    currentGameState = gameStates.Active;
    // Remove all existing blocks (ensure they are removed first)
    // Create a new array from blockList to avoid modifying while iterating
    [...blockList].forEach((block) => {
        block.remove();
    });
    blockList = []; // Clear the list after removing elements

    // Reset blockSpeed to the current app-defined initial speed
    blockSpeed = appInitialBlockSpeed;

    // Re-start main game loops
    clearInterval(blockSpawnIntervalId);
    blockSpawnIntervalId = setInterval(() => { spawnBlock() }, appObstacleSpawnIntervalMs); // Use app-defined interval

    clearInterval(blockMotorIntervalId);
    blockMotorIntervalId = setInterval(() => moveBlock(), 20);

    clearInterval(updateScoreIntervalId);
    updateScoreIntervalId = setInterval(() => updateScore(), 100);
}

// function createTrailSpark() {
//     let newTrailSpark = document.createElement("div")
//     newTrailSpark.classList.add("trailSpark")
//     newTrailSpark.style.left = 100 + "px"
//     newTrailSpark.style.top = playerPos + "px";

//     return newTrailSpark
// }

function getObjProp(obj, prop) {
    return(parseInt(window.getComputedStyle(obj).getPropertyValue(prop)))
}

function isColliding(object1, object2) {
    return (
        getObjProp(object1, "left") >= getObjProp(object2, "left")
        && getObjProp(object1, "left") <= getObjProp(object2, "left") + getObjProp(object2, "width")
    )
    && (
        getObjProp(object1, "top") >= getObjProp(object2, "top")
        && getObjProp(object1, "top") <= getObjProp(object2, "top") + getObjProp(object2, "height")
    )
}

function moveShip() {
    if (currentGameState === gameStates.Active && currentPlayerState === playerStates.Normal) {
        playerObject.style.top = `${playerPos}px`
    }
}

function keyListener(event) {
    if (event.key === "ArrowUp") {
        event.preventDefault()
        if (playerPos !== topLane) playerPos -= 200;
        moveShip()
    }
    if (event.key === "ArrowDown") {
        event.preventDefault()
        if (playerPos !== bottomLane) playerPos += 200;
        moveShip()
    }
    if (event.key === "Escape") {
        event.preventDefault()
        pauseGame()
    }
    if (event.key === "Enter" && currentGameState === gameStates.Over) {
        startGame()
    }
}

function spawnBlock() {
    if (currentGameState === gameStates.Active) {
        let block = createBlock()
        blockList.push(block)
        gameArea.appendChild(block)

        blockSpeed +=accel;
    }
}

function spawnPoint() {
    let point = windowWidth + 300;
    // --- NEW: Ensure blockList is properly cleared or filtered ---
    // This loop prevents new blocks from spawning too close to existing ones.
    // If blockList is not cleared on game start, this could cause issues.
    blockList = blockList.filter(block => block.parentNode === gameArea); // Filter out removed blocks

    blockList.forEach((block) => {
        if (Math.abs(point - (getObjProp(block, "left") + getObjProp(block, "width"))) < 200) {
            point += Math.floor(Math.random() * 400)
        }
    })
    return point
}

function createBlock() {
    let newBlock = document.createElement("div")
    newBlock.style.width = [180, 280, 380][Math.floor(Math.random() * 3)] + "px";
    newBlock.classList.add("block")
    newBlock.style.left = spawnPoint() + "px"
    newBlock.style.top = [10, 210, 410][Math.floor(Math.random() * 3)] + "px";

    // --- MODIFIED / NEW LINES: Apply AI-generated obstacle image or fallback to blobs ---
    if (appObstacleImageUrls.length > 0) {
        const randomObstacleImage = appObstacleImageUrls[Math.floor(Math.random() * appObstacleImageUrls.length)];
        newBlock.style.backgroundImage = `url(${randomObstacleImage})`;
        newBlock.style.backgroundSize = 'contain';
        newBlock.style.backgroundRepeat = 'no-repeat';
        newBlock.style.backgroundPosition = 'center';
        // You might want to remove or set background-color to transparent from CSS
        newBlock.style.backgroundColor = 'transparent'; // Optional: if your .block CSS has a color
    } else {
        // Fallback to default blob images if no AI obstacle images are provided
        const randomBlobImage = blobImages[Math.floor(Math.random() * blobImages.length)];
        newBlock.style.backgroundImage = `url(${randomBlobImage})`;
        newBlock.style.backgroundSize = 'contain';
        newBlock.style.backgroundRepeat = 'no-repeat';
        newBlock.style.backgroundPosition = 'center';
        newBlock.style.backgroundColor = 'transparent'; // Optional: if your .block CSS has a color
    }
    // --- END MODIFIED / NEW LINES ---

    return newBlock
}

function moveBlock() {
    if (currentGameState === gameStates.Active) {
        blockList.forEach((block) => {
            let xPos = getObjProp(block, "left")
            let blockWidth = getObjProp(block, "width")
            if (xPos <= -blockWidth) {
                block.remove(); // Remove element from DOM
                // Remove from blockList array as well to keep it clean
                blockList = blockList.filter(b => b !== block);
            }
            else {
                block.style.left = `${xPos - blockSpeed}px`
            }
            if (isColliding(playerObject, block)) destroyPlayer()
        })
    }
}

function pauseGame() {
    if (currentGameState === gameStates.Paused) {
        currentGameState = gameStates.Active;
        pauseBanner.style.top = "100vh";
        // --- NEW: Resume intervals when unpaused ---
        blockSpawnIntervalId = setInterval(() => { spawnBlock() }, appObstacleSpawnIntervalMs);
        blockMotorIntervalId = setInterval(() => moveBlock(), 20);
        updateScoreIntervalId = setInterval(() => updateScore(), 100);
    }
    else {
        currentGameState = gameStates.Paused;
        pauseBanner.style.top = "0px";
        // --- NEW: Pause intervals when paused ---
        clearInterval(blockSpawnIntervalId);
        clearInterval(blockMotorIntervalId);
        clearInterval(updateScoreIntervalId);
    }
}

function destroyPlayer() {
    // --- NEW: Clear all intervals on player destruction/game over ---
    clearInterval(blockSpawnIntervalId);
    clearInterval(blockMotorIntervalId);
    clearInterval(updateScoreIntervalId);

    playerObject.style.opacity = "0";

    let newExplosion = document.createElement("div")
    newExplosion.className = "explosion"
    newExplosion.style.left = getObjProp(playerObject, "left") + (getObjProp(playerObject, "width") * 0.5) + "px" // Add 'px'
    newExplosion.style.top = getObjProp(playerObject, "top") + (getObjProp(playerObject, "height") * 0.5) + "px" // Add 'px'
    gameArea.appendChild(newExplosion)

    // --- NEW: Remove explosion after animation ---
    newExplosion.addEventListener('animationend', () => {
        newExplosion.remove();
    });

    setTimeout(() => gameOver(), 3000); // Original delay before showing game over
}

function gameOver() {
    if (currentGameState !== gameStates.Over) {
        currentGameState = gameStates.Over;

        let highScore = localStorage.getItem("blockstacleHighScore")
        if (playerScore > highScore) {
            localStorage.setItem("blockstacleHighScore", Math.floor(playerScore))
            highScore = Math.floor(playerScore)
        }
        resultBannerHigh.innerHTML = highScore
        resultBannerCurrent.innerHTML = Math.floor(playerScore)
        resultBanner.style.left = "0px";
    }
}

function updateScore() {
    if (currentGameState === gameStates.Active) {
        playerScore += 0.5;
        scoreBoard.innerHTML = Math.floor(playerScore);
    }
}

window.addEventListener("keydown", keyListener);
pauseBtn.addEventListener("click", pauseGame); // Assuming you have a pauseBtn somewhere


// --- Original intervals (will be overridden by applyGameParameters and startGame) ---
// let blockSpawn = setInterval(() => {spawnBlock()}, 1000 * (5 / blockSpeed));
// let blockMotor = setInterval(() => moveBlock(), 20);
// let creditWHereItsDue = setInterval(() => updateScore(), 100);

// --- NEW: Message Listener for React App Communication ---
window.addEventListener('message', function(event) {
    // IMPORTANT: For security, verify event.origin in production!
    // if (event.origin !== 'http://localhost:3000' && event.origin !== 'https://your-app-domain.com') {
    //     return; // Discard messages from untrusted origins
    // }

    // Destructure `data` as well, as GameEditor.js now sends asset payloads in `data` object
    const { type, key, value, assetType, url, data } = event.data;

    console.log(`[Speed Runner Game]: Received message - Type: ${type}, Key: ${key}, Value: ${value}, AssetType: ${assetType}, URL: ${url}, Data:`, data);

    if (type === 'UPDATE_PARAM') {
        if (key === 'playerSpeedX') {
            appInitialBlockSpeed = value;
            // Note: This only sets the *initial* speed. Game speed still accelerates.
            // If the game is active, apply immediately (will restart game with new speed)
            if (currentGameState === gameStates.Active) {
                startGame(); // Restart game to apply new base speed and spawn rate
            }
        } else if (key === 'obstacleSpawnDelay') {
            appObstacleSpawnIntervalMs = value;
            // If the game is active, apply immediately (will restart game with new spawn rate)
            if (currentGameState === gameStates.Active) {
                startGame(); // Restart game to apply new base speed and spawn rate
            }
        }
        // --- Note on other parameters: ---
        // 'obstacleSpeedY' from React config: This game's obstacles move horizontally, and their speed
        // is the 'blockSpeed'. This parameter is largely redundant with 'playerSpeedX' which controls
        // the initial blockSpeed. Not used explicitly here to avoid over-complicating.
        // 'jumpForce' from React config: This game is a lane-switcher (ArrowUp/Down) and does not
        // have a 'jump' mechanic. This parameter is not applicable to its current functionality.
        // You would need to add a new mechanic (e.g., player size change) to use this.

    } else if (type === 'UPDATE_ASSET') {
        // --- IMPORTANT CHANGE: assetType is now 'character' (matches GameEditor.js config) ---
        if (assetType === 'character') {
            let receivedUrls = [];

            // Case 1: data object exists and contains an array of urls (e.g., for multiple static images)
            if (data && Array.isArray(data.urls) && data.urls.length > 0) {
                receivedUrls = data.urls;
            }
            // Case 2: data object exists and contains a single imageUrl string
            else if (data && typeof data.imageUrl === 'string') {
                receivedUrls = [data.imageUrl];
            }
            // Case 3: 'url' property itself is a string (legacy/single image directly passed)
            else if (typeof url === 'string') {
                receivedUrls = [url];
            }
            // Case 4: data contains animationData (for animated assets, we'll use first frame/imageUrl if present)
            else if (data && data.isAnimated && data.prefix) {
                console.warn("[Speed Runner Game]: Received animated character. Currently only displaying first frame or default.");
                if (data.imageUrl) { // animationData might have a preview imageUrl
                    receivedUrls = [data.imageUrl];
                } else {
                    // Fallback to default if no specific image in animationData
                    receivedUrls = ['./assets/player.png'];
                }
            }


            if (receivedUrls.length > 0) {
                appMainCharacterImageUrls = receivedUrls;
                // Apply immediately to the player object - displaying only the first image
                if (playerObject) {
                    playerObject.style.backgroundImage = `url(${appMainCharacterImageUrls[0]})`;
                    playerObject.style.backgroundSize = 'contain'; // Ensure proper sizing
                    playerObject.style.backgroundRepeat = 'no-repeat'; // Prevent tiling
                    playerObject.style.backgroundPosition = 'center'; // Center the image
                    // --- NEW: Hide the inner <img> tag if an AI image is applied to the parent div ---
                    if (playerShipImage) {
                        playerShipImage.style.display = 'none'; // Hide the original <img>
                    }
                }
                console.log("[Speed Runner Game]: Updated player images.", appMainCharacterImageUrls);
            } else {
                console.warn("[Speed Runner Game]: UPDATE_ASSET for character received with no usable URL(s).", event.data);
            }
        }
        // --- Handle background asset updates ---
        else if (assetType === 'background') {
            let finalBackgroundUrl = null;
            // Prioritize `data.imageUrl` if available (from AI generation)
            if (data && typeof data.imageUrl === 'string') {
                finalBackgroundUrl = data.imageUrl;
            }
            // Fallback to `url` property if it's a string
            else if (typeof url === 'string') {
                finalBackgroundUrl = url;
            }
            // If data contains urls array, take the first one
            else if (data && Array.isArray(data.urls) && data.urls.length > 0 && typeof data.urls[0] === 'string') {
                finalBackgroundUrl = data.urls[0];
            }


            if (finalBackgroundUrl) {
                appBackgroundImageUrl = finalBackgroundUrl;
                // Apply immediately to the game area background
                if (gameArea) {
                    gameArea.style.backgroundImage = `url(${appBackgroundImageUrl})`;
                    gameArea.style.backgroundSize = 'cover';
                    gameArea.style.backgroundRepeat = 'no-repeat';
                    gameArea.style.backgroundPosition = 'center';
                }
                console.log("[Speed Runner Game]: Updated background image.", appBackgroundImageUrl);
            } else {
                console.warn("[Speed Runner Game]: UPDATE_ASSET for background received with no usable URL.", event.data);
            }
        }
        // --- Handle obstacle asset updates ---
        else if (assetType === 'obstacle') {
            let receivedUrls = [];

            // Case 1: data object exists and contains an array of urls (most common for AI obstacles)
            if (data && Array.isArray(data.urls) && data.urls.length > 0) {
                receivedUrls = data.urls;
            }
            // Case 2: data object exists and contains a single imageUrl string
            else if (data && typeof data.imageUrl === 'string') {
                receivedUrls = [data.imageUrl];
            }
            // Case 3: 'url' property itself is an array (less common but handled for robustness)
            else if (Array.isArray(url)) {
                receivedUrls = url;
            }
            // Case 4: 'url' property itself is a string (single image directly passed)
            else if (typeof url === 'string') {
                receivedUrls = [url];
            }
            // Case 5: data contains animationData (for animated obstacles, we'll use first frame/imageUrl if present)
            else if (data && data.isAnimated && data.prefix) {
                console.warn("[Speed Runner Game]: Received animated obstacle. Currently only displaying first frame or default.");
                if (data.imageUrl) { // animationData might have a preview imageUrl
                    receivedUrls = [data.imageUrl];
                } else {
                    // Fallback to default blobs if no specific image in animationData
                    receivedUrls = blobImages;
                }
            }


            if (receivedUrls.length > 0) {
                appObstacleImageUrls = receivedUrls;
                console.log("[Speed Runner Game]: Updated obstacle images.", appObstacleImageUrls);
            } else {
                appObstacleImageUrls = []; // Clear if invalid format, falling back to default blobs.
                console.warn("[Speed Runner Game]: UPDATE_ASSET for obstacle received with no usable URL(s).", event.data);
            }
            // No need to restart the game, new blocks will use these next.
        }
    }
}, false);


// --- NEW: Initial setup on page load ---
// This ensures that when the game iframe loads, it immediately applies any
// default parameters from the React config or the default asset paths.
document.addEventListener('DOMContentLoaded', () => {
    // Initial application of parameters and assets when the game's HTML/JS loads
    applyGameParameters();

    // The original game auto-starts, but we want it to wait for an explicit 'Start' click or 'Enter' key.
    // If you want it to auto-start when the page loads, remove the startGame() call from the Enter key listener
    // and call startGame() here. For now, it waits for Enter key.
    // However, if your React app has a "Start Game" button, you'll need to send a message to trigger startGame()
    // or simulate an "Enter" key press.
    // Given the Blockstackle game's original index.html has a "START" button, you might interact with that.
});
