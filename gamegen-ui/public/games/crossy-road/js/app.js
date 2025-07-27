// app.js

// --- START OF CHANGES FOR REACT INTEGRATION & EXPORT ---

// Define a global object to store game settings.
// IMPORTANT: For exported games, EXPORTED_GAME_PARAMETERS and EXPORTED_CURRENT_ASSETS
// will be injected by the backend BEFORE this script runs.
// We prioritize these injected values. If they don't exist (i.e., in editor preview),
// we fall back to the default values.

// Check if EXPORTED_GAME_PARAMETERS and EXPORTED_CURRENT_ASSETS exist (injected by backend)
const exportedParams = typeof EXPORTED_GAME_PARAMETERS !== 'undefined' ? EXPORTED_GAME_PARAMETERS : {};
const exportedAssets = typeof EXPORTED_CURRENT_ASSETS !== 'undefined' ? EXPORTED_CURRENT_ASSETS : {};

window.gameSettings = {
    // Merge exported parameters first, then fall back to hardcoded defaults
    obstacleSpeed: exportedParams.obstacleSpeed !== undefined ? exportedParams.obstacleSpeed : 2,
    trafficDensity: exportedParams.trafficDensity !== undefined ? exportedParams.trafficDensity : 0.5,
    playerMoveDelay: exportedParams.playerMoveDelay !== undefined ? exportedParams.playerMoveDelay : 100,
    gameDuration: exportedParams.gameDuration !== undefined ? exportedParams.gameDuration : 180,

    // Merge exported assets first, then fall back to hardcoded default paths
    // Note: aiAssetPaths from backend sends Base64, which will be directly used.
    // If it's undefined (editor mode or no AI asset), use the local path.
    playerSpriteUrl: exportedAssets.character || 'images/char-boy.png',
    enemySpriteUrl: exportedAssets.obstacle || 'images/enemy-bug.png'
};

// Global variables for game timer and interval
var gameTimer;
var gameInterval;

// NEW: Game state variables
var gameStarted = false; // Tracks if the game has been started by the user
var gamePaused = false; // Tracks if the game is currently paused

// Add a message listener to receive updates from the parent React iframe
window.addEventListener('message', function(event) {
    const message = event.data;
    console.log("[Crossy Road Game]: Received message:", message);

    if (message.type === 'UPDATE_PARAM') {
        if (window.gameSettings.hasOwnProperty(message.key)) {
            window.gameSettings[message.key] = message.value;
            console.log(`[Crossy Road Game]: Updated parameter ${message.key} to ${message.value}`);

            if (message.key === 'obstacleSpeed') {
                allEnemies.forEach(enemy => {
                    if (enemy.initialSpeedFactor !== undefined) {
                        enemy.speed = enemy.initialSpeedFactor * window.gameSettings.obstacleSpeed;
                    } else {
                        enemy.speed = 100 * window.gameSettings.obstacleSpeed;
                    }
                });
            } else if (message.key === 'gameDuration') {
                // If game is not started, just update the display
                if (!gameStarted) {
                    timeLeft = window.gameSettings.gameDuration;
                    displayScoreLevel(score, gameLevel, timeLeft);
                } else {
                    // If the game is running, changing duration will affect *next* game.
                    console.log("[Crossy Road Game]: Game Duration will apply on next game start.");
                    timeLeft = window.gameSettings.gameDuration; // Update for display
                    displayScoreLevel(score, gameLevel, timeLeft);
                }
            } else if (message.key === 'trafficDensity') {
                if (gameStarted) { // Only re-apply if game is running
                    increaseDifficulty(score); // Re-creates enemies with new density
                }
            }
        }
    } else if (message.type === 'UPDATE_ASSET') {
        let finalUrlToUse = null;

        // gameeditor.js is designed to send 'url' for simple static images,
        // or 'data.imageUrl' if it's an animated asset's preview (even if Crossy Road won't animate it),
        // or 'data.urls[0]' for multi-static assets like gemSet.
        // For Crossy Road, we just need a single static image URL.
        if (message.url) {
            finalUrlToUse = message.url;
        } else if (message.data && message.data.imageUrl) {
            finalUrlToUse = message.data.imageUrl;
        } else if (message.data && message.data.urls && message.data.urls.length > 0) {
            finalUrlToUse = message.data.urls[0];
        }

        if (!finalUrlToUse) {
            console.warn("[Crossy Road Game]: UPDATE_ASSET received with no usable URL.", message);
            return;
        }

        // --- START OF MODIFICATION for live preview ---
        // Ensure the new asset is loaded by Resources BEFORE assigning it.
        // This is the key change for live updates.
        if (message.assetType === 'character') {
            // Only update and load if the URL is actually new to prevent unnecessary reloads
            if (window.gameSettings.playerSpriteUrl !== finalUrlToUse) {
                window.gameSettings.playerSpriteUrl = finalUrlToUse;
                // Load the new sprite into the Resources cache
                Resources.load(finalUrlToUse);
                // Assign the sprite to the player object immediately after starting load
                // We need to wait for resources to finish loading before rendering
                // For live preview, a simple re-assignment is often enough, but a callback
                // on Resources.load might be more robust if rendering heavily depends on it.
                // For now, assume Resources.get will eventually return the image once loaded.
                if (player) {
                    player.sprite = finalUrlToUse;
                }
            }
        } else if (message.assetType === 'obstacle') {
            // Only update and load if the URL is actually new
            if (window.gameSettings.enemySpriteUrl !== finalUrlToUse) {
                window.gameSettings.enemySpriteUrl = finalUrlToUse;
                // Load the new sprite into the Resources cache
                Resources.load(finalUrlToUse);
                // Assign the sprite to all current enemies and any new ones
                if (allEnemies) {
                    allEnemies.forEach(enemy => {
                        enemy.sprite = finalUrlToUse;
                    });
                }
            }
        }
        // --- END OF MODIFICATION for live preview ---
    }
});

// --- END OF CHANGES FOR REACT INTEGRATION & EXPORT ---

// Enemies our player must avoid
var Enemy = function(x, y, baseSpeedFactor) {
    this.x = x;
    this.y = y;
    this.speed = baseSpeedFactor * window.gameSettings.obstacleSpeed;
    this.initialSpeedFactor = baseSpeedFactor;

    this.sprite = window.gameSettings.enemySpriteUrl;
    // Define target dimensions for the enemy sprite
    this.width = 101; // Standard width of an enemy bug/car
    this.height = 83; // Standard height of an enemy bug/car
};

// Update the enemy's position
Enemy.prototype.update = function(dt) {
    if (gamePaused) return; // Don't update if paused
    this.x += this.speed * dt;

    if (this.x >= 505) {
        this.x = -100;
        this.y = Math.random() * 184 + 50;
        this.speed = this.initialSpeedFactor * window.gameSettings.obstacleSpeed;
    }

    checkCollision(this);
};

// Draw the enemy
Enemy.prototype.render = function() {
    // MODIFIED: Draw with specific width and height
    // Adjust x, y for centering if needed, but for now, just scale
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y, this.width, this.height);
};

// Player class
var Player = function(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.sprite = window.gameSettings.playerSpriteUrl;
    // Define target dimensions for the player sprite
    this.width = 66; // Standard width of player character
    this.height = 80; // Standard height of player character
};

Player.prototype.update = function() {
    // function not needed right now
}

// Draw the player and display score/level/time
Player.prototype.render = function() {
    // MODIFIED: Draw with specific width and height
    // Adjust x, y to center the new image within the original player bounds
    const playerRenderX = this.x - (this.width / 2) + 50; // Roughly center horizontally in a 101px block
    const playerRenderY = this.y - (this.height / 2) + 83; // Roughly center vertically in an 83px block
    ctx.drawImage(Resources.get(this.sprite), playerRenderX, playerRenderY, this.width, this.height);
    displayScoreLevel(score, gameLevel, timeLeft);
};

Player.prototype.handleInput = function(keyPress) {
    if (gamePaused || !gameStarted) return; // Don't allow input if paused or not started

    var moveDistance = 50;
    var verticalMoveAdjust = 20;

    if (keyPress == 'left') {
        player.x -= moveDistance;
    }
    if (keyPress == 'up') {
        player.y -= (moveDistance - verticalMoveAdjust);
    }
    if (keyPress == 'right') {
        player.x += moveDistance;
    }
    if (keyPress == 'down') {
        player.y += (moveDistance - verticalMoveAdjust);
    }
};

// Function to display player's score and time
var scoreLevelDiv;
var displayScoreLevel = function(aScore, aLevel, aTimeLeft) {
    if (!scoreLevelDiv) {
        scoreLevelDiv = document.createElement('div');
        scoreLevelDiv.id = 'game-info-display';
        var canvasElements = document.getElementsByTagName('canvas');
        if (canvasElements.length > 0) {
            document.body.insertBefore(scoreLevelDiv, canvasElements[0]);
        } else {
            document.body.appendChild(scoreLevelDiv);
        }
    }
    scoreLevelDiv.innerHTML = `Score: ${aScore} / Level: ${aLevel} / Time: ${aTimeLeft}s`;
};

var initializePlayerPosition = function() {
    if (player) {
        player.x = 202.5;
        player.y = 383;
    } else {
        console.warn("Player object not yet initialized when initializePlayerPosition was called.");
    }
};

var checkCollision = function(anEnemy) {
    // Collision detection logic remains the same, assuming original sprite dimensions for hitboxes.
    // If AI-generated sprites have vastly different aspect ratios or transparent areas,
    // this collision logic might need adjustment based on the new visual bounds.
    if (
        player.y + 131 >= anEnemy.y + 90
        && player.x + 25 <= anEnemy.x + 88
        && player.y + 73 <= anEnemy.y + 135
        && player.x + 76 >= anEnemy.x + 11) {
        console.log('collided');
        initializePlayerPosition();
        // Reset score/level on collision for simplicity, or implement lives.
        score = 0;
        gameLevel = 1;
        increaseDifficulty(0); // Reset difficulty on collision too
        displayScoreLevel(score, gameLevel, timeLeft); // Update display
    }

    if (player.y + 63 <= 0) {
        initializePlayerPosition();
        console.log('you made it!');

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 505, 171);

        score += 1;
        gameLevel += 1;
        console.log('current score: ' + score + ', current level: ' + gameLevel);
        increaseDifficulty(score);
    }

    if (player.y > 383 ) {
        player.y = 383;
    }
    if (player.x > 402.5) {
        player.x = 402.5;
    }
    if (player.x < 2.5) {
        player.x = 2.5;
    }
};


var increaseDifficulty = function(numEnemies) {
    allEnemies.length = 0;

    const maxEnemiesBasedOnDensity = Math.round(5 * (1 - window.gameSettings.trafficDensity) + 1);
    const numEnemiesToSpawn = Math.min(numEnemies + 1, maxEnemiesBasedOnDensity + 1);

    for (var i = 0; i < numEnemiesToSpawn; i++) {
        var baseSpeedFactor = Math.random() * (200 - 50) + 50;

        var enemy = new Enemy(
            Math.random() * 505,
            Math.random() * 184 + 50,
            baseSpeedFactor
        );
        // Ensure new enemies get the latest static enemy sprite URL
        enemy.sprite = window.gameSettings.enemySpriteUrl;
        allEnemies.push(enemy);
    }
};

var timeLeft = 0; // Initialize timeLeft with 0, will be set on startGame or initializeGame
function startGameTimer() {
    if (gameTimer) clearTimeout(gameTimer);
    if (gameInterval) clearInterval(gameInterval);

    timeLeft = window.gameSettings.gameDuration; // Start with the configured duration
    console.log(`Starting game with ${timeLeft} seconds.`);

    displayScoreLevel(score, gameLevel, timeLeft); // Initial display

    gameInterval = setInterval(() => {
        timeLeft--;
        displayScoreLevel(score, gameLevel, timeLeft);
        if (timeLeft <= 0) {
            clearInterval(gameInterval);
            endGame();
        }
    }, 1000);
}

// NEW: Function to pause the game timer and enemy movement
function pauseGame() {
    if (gameStarted && !gamePaused) {
        gamePaused = true;
        clearInterval(gameInterval); // Stop the timer
        // Optionally, display "PAUSED" on screen
        console.log("Game Paused");
    }
}

// NEW: Function to unpause the game timer and enemy movement
function unpauseGame() {
    if (gameStarted && gamePaused) {
        gamePaused = false;
        startGameTimer(); // Restart the timer
        console.log("Game Unpaused");
    }
}


function endGame() {
    console.log("Game Over! Time's up.");
    alert(`Game Over! Your final score: ${score} at Level: ${gameLevel}`);
    initializeGame(); // Reset game state but don't auto-start
    gameStarted = false; // Ensure gameStarted is false after game over
    gamePaused = false; // Ensure gamePaused is false
    // Also, update the START button text if it changed, or hide/show relevant UI
}


// --- CORE GAME INITIALIZATION FUNCTION (MODIFIED) ---
// This function now only sets up the initial game state, it does NOT start the timer.
function initializeGame() {
    score = 0;
    gameLevel = 1;
    player = new Player(202.5, 383, 50);
    initializePlayerPosition();
    allEnemies.length = 0;
    increaseDifficulty(0);
    timeLeft = window.gameSettings.gameDuration; // Set initial time from settings
    displayScoreLevel(score, gameLevel, timeLeft); // Display initial time

    // --- START OF MODIFICATION for export ---
    // Ensure initial default/exported sprites are loaded by Resources.
    // This is crucial for the very first render before any AI assets are generated,
    // and for exported games where AI assets are loaded from file.
    Resources.load(window.gameSettings.playerSpriteUrl);
    Resources.load(window.gameSettings.enemySpriteUrl);
    // --- END OF MODIFICATION for export ---
}

// NEW: Function to be called when the START button is clicked
function startButtonClick() {
    if (!gameStarted) { // Only start if game is not already running
        console.log("START button clicked. Starting game...");
        gameStarted = true;
        gamePaused = false; // Ensure not paused
        initializeGame(); // Initialize game state (resets score, level, player position)
        startGameTimer(); // Start the actual game timer and enemy movement
    } else if (gamePaused) {
        // If game was paused, unpause it
        unpauseGame();
    }
}

// NEW: Function to be called when the PAUSE button is clicked
function pauseButtonClick() {
    if (gameStarted && !gamePaused) {
        pauseGame();
    } else if (gameStarted && gamePaused) {
        unpauseGame();
    }
}


var allEnemies = [];
var player;
var score = 0;
var gameLevel = 1;

// Expose initializeGame for engine.js reset, but it now just prepares state
window.appInitializeGame = initializeGame;


document.addEventListener('keydown', function(e) {
    var allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down'
    };

    if (player) {
        // Ensure input is only handled if game is started and not paused
        if (gameStarted && !gamePaused) {
            player.handleInput(allowedKeys[e.keyCode]);
            console.log(allowedKeys[e.keyCode]);
        }
    }
});

// NEW: Event Listeners for the START and PAUSE buttons
document.addEventListener('DOMContentLoaded', () => {
    // Initial setup (like the score/level/time display)
    initializeGame(); // This will set up initial display, but not start timer

    const startButton = document.getElementById('startButton');
    const pauseButton = document.getElementById('pauseButton');

    if (startButton) {
        startButton.addEventListener('click', startButtonClick);
        console.log("START button event listener attached.");
    }
    if (pauseButton) {
        pauseButton.addEventListener('click', pauseButtonClick);
        console.log("PAUSE button event listener attached.");
    }
});