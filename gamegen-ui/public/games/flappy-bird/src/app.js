// gamegen-ui/games/flappy-bird/app.js

import { Bird } from "./bird.js";
import { Pipe } from "./pipes.js";

// Game Constants
const GAME_LOOP_INTERVAL = 20;
const FLAP_INTERVAL = 100; // This will now control dynamic sprite animation speed

// Bird
const BIRD_START_Y = 120; // This is the intended starting Y position
const BIRD_START_X = 220;
const LIFT = -5;
const JUMP_HEIGHT = 15;
const MAX_HEIGHT = 540;
const MAX_ROTATION = 90;

// Pipe
const PIPE_GAP = 400;
const PIPE_GEN_TIME = 2000;
const PIPE_START_X = 500;
const PIPE_BASE_Y = -200;
const PIPE_BASE_SPEED = 3;
const PIPE_SCREEN_END = -60;

// World
const GRAVITY = 0.4;

// CSS Classes
const GROUND_MOVING = "ground-moving";
const BASE_GROUND = "ground";

// Game Screen
const SCREENS = {
    start: "start",
    gameplay: "gameplay",
    gameOver: "gameOver",
};

// DOM EVENT LISTENER
document.addEventListener("DOMContentLoaded", () => {
    let game = new FlappyBird();

    // The "Message Listener" for communication with the React app
    window.addEventListener("message", (event) => {
        // IMPORTANT: For security, verify event.origin in production!
        // if (event.origin !== 'http://localhost:3000' && event.origin !== 'https://your-app-domain.com') {
        //     return; // Discard messages from untrusted origins
        // }

        // Destructure properties directly from event.data
        const { type, key, value, assetType, url, data } = event.data;

        console.log(`[Flappy Bird Game]: Received message - Type: ${type}, Key: ${key}, Value: ${value}, AssetType: ${assetType}, URL: ${url}, Data:`, data);

        if (type === 'UPDATE_PARAM') {
            // Handle individual parameter updates
            if (key === 'gravity') {
                game.updateSettings({ gravity: value });
            } else if (key === 'speed') {
                game.updateSettings({ speed: value });
            } else if (key === 'pipeGap') {
                game.updateSettings({ pipeGap: value });
            }
        }
        // Check if the message is for updating assets (bird, pipe, background)
        else if (type === 'UPDATE_ASSET') {
            switch (assetType) {
                case 'character':
                    // 'data' will contain the animation object if animated, otherwise 'url' will be the string
                    game.updateBirdImage(data || { url: url, isAnimated: false });
                    // --- FIX: Explicitly re-initialize the flap animation after updating the bird image ---
                    game.resetFlapAnimation(); 
                    break;
                case 'obstacle':
                    // Extract imageUrl from 'data' object for static assets
                    game.updatePipeImage(data && data.imageUrl ? data.imageUrl : url);
                    break;
                case 'background':
                    // Extract imageUrl from 'data' object for static assets
                    game.updateBackgroundImage(data && data.imageUrl ? data.imageUrl : url);
                    break;
                // Add other asset types here if needed for other games
                default:
                    console.warn(`Unknown asset type received: ${assetType}`);
            }
        }
    });

    // Start the game menu as before
    game.startMenu();
});

// Flappy Bird Game Class
class FlappyBird {
    // DOM Objects
    #gameDisplayDOM;
    #birdDOM;
    #skyDOM;
    #groundDOM;
    #scoreDOM;
    #startMenuDOM;
    #startMenuTextDOM;
    #gameOverDOM;
    #gameOverScoreDOM;
    #gameOverHighScoreDOM;

    // Game Objects
    #bird;
    #pipes;
    #pipeSpeed;
    #pipeGap;

    // Timers
    #gameLoopTimer;
    #pipeGenTimer;
    #flapTimer; // This timer will now be conditionally used for CSS or dynamic sprite animation

    // Game State
    #isGameOver;
    #isCollision;
    #lastTime;
    #score;
    #highScore;
    #gameScreen; // Start Menu, Gameplay, Game Over
    #canRestart; // NEW: Flag to control game restart after game over

    // Sounds
    #dieSound;
    #diveSound;
    #hitSound;
    #pointSound;
    #flySound;

    // --- NEW PROPERTIES FOR DYNAMIC ASSETS (pipes and background) ---
    #currentPipeImageUrl = null; // Stores the URL of the custom pipe image
    #currentBackgroundImageUrl = null; // Stores the URL of the custom background image

    constructor() {
        // DOM Element References
        this.#gameDisplayDOM = document.querySelector(".game-container");
        this.#birdDOM = document.querySelector(".bird");
        this.#skyDOM = document.querySelector(".sky");
        this.#groundDOM = document.querySelector(".ground");
        this.#scoreDOM = document.getElementById("score-container");
        this.#startMenuDOM = document.getElementById("start-menu");
        this.#startMenuTextDOM = document.getElementById("start-menu-text");
        this.#gameOverDOM = document.getElementById("game-over");
        this.#gameOverScoreDOM = document.getElementById("score");
        this.#gameOverHighScoreDOM = document.getElementById("best-score");

        // Initialize Game State
        this.#isGameOver = false;
        this.#isCollision = false;
        this.#lastTime = 0;
        this.#gameScreen = SCREENS.start;
        this.#canRestart = true; // Initially true to allow starting the game

        // Load Sounds
        this.#dieSound = new Audio("assets/sound/die.wav");
        this.#diveSound = new Audio("assets/sound/dive.wav");
        this.#hitSound = new Audio("assets/sound/hit.wav");
        this.#pointSound = new Audio("assets/sound/point.wav");
        this.#flySound = new Audio("assets/sound/fly.wav");

        // Preload Sounds for better performance
        this.#dieSound.preload = "auto";
        this.#diveSound.preload = "auto";
        this.#hitSound.preload = "auto";
        this.#pointSound.preload = "auto";
        this.#flySound.preload = "auto";

        // Set Sound Volumes
        this.#dieSound.volume = 0.5;
        this.#diveSound.volume = 0.5;
        this.#hitSound.volume = 0.3;
        this.#pointSound.volume = 0.2;
        this.#flySound.volume = 0.5;

        // Initialize Game Objects
        this.#pipes = [];
        this.#pipeSpeed = PIPE_BASE_SPEED; // Initial pipe speed
        this.#pipeGap = PIPE_GAP; // Initial pipe gap

        // Initialize the Bird object
        this.#bird = new Bird(
            BIRD_START_X,
            BIRD_START_Y,
            GRAVITY,
            LIFT,
            JUMP_HEIGHT,
            MAX_HEIGHT,
            MAX_ROTATION,
            this.#birdDOM,
            this.#flySound
        );
        // Explicitly set the default bird image/animation after construction
        this.#bird.setImage({
            url: 'assets/images/yellowbird-midflap.png',
            isAnimated: false // Default bird is not sprite animated, uses CSS classes
        });
        this.#bird.update(0); // This applies BIRD_START_Y to its 'bottom' style

        // Set initial default assets (pipes and background)
        this.#currentPipeImageUrl = '/games/flappy-bird/assets/images/pipe.png';
        // Corrected path for background image
        this.#currentBackgroundImageUrl = '/games/flappy-bird/assets/images/background.png'; 
        this.applyBackgroundImage(this.#currentBackgroundImageUrl); // Apply default background on load

        // Initialize Scores
        this.#score = 0;
        this.#highScore = this.getHighScore();
        console.log(`[App.js Debug]: Constructor - Initial #highScore after getHighScore(): ${this.#highScore}`); // NEW LOG

        // Bind event handlers to the current instance
        this.controls = this.controls.bind(this);
        document.addEventListener("keydown", this.controls); // Changed to keydown for immediate flap
        document.addEventListener("keyup", this.handleKeyUp); // NEW: Add keyup listener for restart control
    }

    /**
     * Handles keyup events, specifically for allowing game restart after game over.
     * @param {KeyboardEvent} e - The keyboard event object.
     */
    handleKeyUp = (e) => { // Using arrow function to auto-bind 'this'
        if (e.keyCode === 32) { // Spacebar released
            if (this.#gameScreen === SCREENS.gameOver) {
                this.#canRestart = true; // Allow restart only after spacebar is released in game over state
            }
        }
    }

    /**
     * Updates game settings (gravity, pipe speed, pipe gap) based on input from the React UI.
     * @param {object} settings - An object containing new game settings.
     */
    updateSettings(settings) {
        if (typeof settings.gravity !== 'undefined') {
            this.#bird.setGravity(settings.gravity);
        }
        if (typeof settings.speed !== 'undefined') {
            this.#pipeSpeed = settings.speed;
        }
        if (typeof settings.pipeGap !== 'undefined') {
            this.#pipeGap = settings.pipeGap;
        }
    }

    /**
     * Updates the bird's image or animation based on asset data from the React UI.
     * @param {object} assetData - An object containing image URL or animation properties.
     */
    updateBirdImage(assetData) {
        // This will set #isAnimatedAsset to true and update the bird's appearance.
        this.#bird.setImage(assetData);
        // Reset bird's position and internal state WITHOUT changing its current image.
        // The bird.reset() method in bird.js is now modified to NOT touch the image.
        this.#bird.reset(BIRD_START_X, BIRD_START_Y);
        this.#bird.update(0); // Apply the position to the DOM immediately after reset
        // The resetFlapAnimation is now called explicitly after this function in the message listener
    }

    /**
     * Updates the image URL for newly generated pipes.
     * @param {string} imageUrl - The URL of the new pipe image.
     */
    updatePipeImage(imageUrl) {
        this.#currentPipeImageUrl = imageUrl;
        // For existing pipes, update their images directly
        this.#pipes.forEach(pipeEntry => {
            pipeEntry[0].setImage(imageUrl);
        });
    }

    /**
     * Updates the background image of the game container.
     * @param {string} imageUrl - The URL of the new background image.
     */
    updateBackgroundImage(imageUrl) {
        this.#currentBackgroundImageUrl = imageUrl;
        this.applyBackgroundImage(imageUrl);
    }

    /**
     * Applies the background image to the #skyDOM.
     * @param {string} imageUrl - The URL of the background image.
     */
    applyBackgroundImage(imageUrl) {
        this.#skyDOM.style.backgroundImage = `url(${imageUrl})`;
        this.#skyDOM.style.backgroundSize = 'cover';
        this.#skyDOM.style.backgroundRepeat = 'no-repeat';
        this.#skyDOM.style.backgroundPosition = 'center';
    }

    /**
     * Resets and re-initializes the bird's flapping animation based on its current asset state.
     * This ensures that if a custom animated bird is loaded, its animation continues,
     * otherwise, the default CSS animation is used.
     */
    resetFlapAnimation() {
        clearInterval(this.#flapTimer); // Stop any existing flap timer
        this.#flapTimer = setInterval(() => {
            // Check if the bird object is using an animated asset
            if (this.#bird.getIsAnimatedAsset()) {
                this.#bird.animateSprite(); // Call new method for sprite animation
            } else {
                this.#bird.flap(); // Use original CSS class-based flap
            }
        }, FLAP_INTERVAL);
    }

    /**
     * Displays the start menu and initializes the bird's flapping animation.
     */
    startMenu() {
        // Show Start Menu
        this.#startMenuDOM.className = "start-menu-container ";
        // Initialize bird flap animation (will use default CSS initially)
        this.resetFlapAnimation();
    }

    /**
     * Handles game over state: stops game loops, updates UI, saves score.
     */
    setGameOver() {
        this.#isGameOver = true;
        this.#canRestart = false; // Prevent immediate restart
        // Stop all game-related timers
        clearInterval(this.#gameLoopTimer);
        clearInterval(this.#pipeGenTimer);
        clearInterval(this.#flapTimer); // Stop bird flapping animation

        // Stop Ground Movement animation
        this.#groundDOM.className = BASE_GROUND;
        // Hide Score Counter
        this.#scoreDOM.className = "hidden";
        // Save current score if it's a new high score
        this.saveScore();
        // Transition to Game Over screen
        this.#gameScreen = SCREENS.gameOver;
        this.#gameOverDOM.className = "game-over-container";
        // Display final scores
        this.showScore();
        // Play die sound after a short delay to allow hit sound to play first
        setTimeout(() => {
            this.#dieSound.currentTime = 0;
            this.#dieSound.play();
        }, 100); // Adjust delay as needed
    }

    /**
     * Initiates the game, resetting state if necessary.
     */
    startGame() {
        // Set game state
        if (this.#isGameOver) {
            this.#isCollision = false;
            this.#isGameOver = false;
            this.deletePipes(); // Clear all pipes from previous game
            this.#lastTime = 0;
            this.#score = 0;
        }

        // Play dive sound when game starts/bird jumps
        this.#diveSound.play();

        // Ground Movement animation
        this.#groundDOM.className = GROUND_MOVING;
        // Show Score Counter
        this.#scoreDOM.className = "score";

        // Start main game loop
        this.#gameLoopTimer = setInterval(
            () => this.gameLoop(),
            GAME_LOOP_INTERVAL
        );

        // Re-initialize bird flap animation (important for restarts with custom assets)
        this.#bird.reset(BIRD_START_X, BIRD_START_Y); // Reset position and internal state
        this.#bird.update(0); // Apply the position to the DOM immediately
        this.resetFlapAnimation(); // This will use the already set image

        // Start generating pipes
        this.#pipeGenTimer = setInterval(() => this.generatePipes(), PIPE_GEN_TIME);

        // Set game screen to gameplay
        this.#gameScreen = SCREENS.gameplay;
    }

    /**
     * The main game loop, called repeatedly to update game state.
     */
    gameLoop() {
        // Increment game time counter
        this.#lastTime++;

        // Update bird's position and rotation based on gravity and speed
        this.#bird.update(this.#lastTime);

        // Update displayed score
        this.updateScore();

        // Check for ground collision
        if (this.#bird.getPosY() <= 0) {
            if (!this.#isCollision) {
                this.setCollision(); // Handle collision effects
            }
            this.setGameOver(); // End the game
        }
    }

    /**
     * Handles collision events (bird hitting ground or pipes).
     */
    setCollision() {
        // Play hit sound
        this.#hitSound.currentTime = 0;
        this.#hitSound.play();
        // Set collision flag
        this.#isCollision = true;
        // Stop bird's vertical movement immediately
        this.#bird.setZeroSpeed();
        // Stop Ground Movement animation
        this.#groundDOM.className = BASE_GROUND;
        // Trigger visual flash effect
        this.triggerFlash();
    }

    /**
     * Creates and manages new pipes.
     */
    generatePipes() {
        // Create a new Pipe instance
        let pipe = new Pipe(
            PIPE_START_X,
            PIPE_BASE_Y,
            this.#pipeGap, // Uses dynamic pipeGap
            this.#skyDOM,
            this.#pipeSpeed, // Uses dynamic pipeSpeed
        );

        // Apply the current custom pipe image if available
        if (this.#currentPipeImageUrl) {
            pipe.setImage(this.#currentPipeImageUrl);
        }

        pipe.draw(); // Add pipe elements to the DOM

        // Function to move the pipe and check for collisions/points
        const movePipe = () => {
            // Pass the entire bird object to checkCollision for dynamic dimensions
            // Only update pipe position if game is not over and no collision
            if (!this.#isCollision && !this.#isGameOver) {
                pipe.update();
                // Check for collision with the bird
                if (pipe.checkCollision(this.#bird)) { // <-- Pass the bird object
                    console.log("[App.js Debug]: Collision detected by pipe.checkCollision! Triggering game over."); // NEW LOG
                    this.setCollision();
                    this.setGameOver(); // <-- ADDED: End game on pipe collision
                }
            }

            // If pipe moves off screen, delete it and clear its interval
            if (pipe.getPosX() === PIPE_SCREEN_END) {
                pipe.delete();
                clearInterval(timerId); // Stop this specific pipe's movement
            }
            // Check if bird has successfully passed the pipe
            if (pipe.hasPassed()) {
                this.#pointSound.currentTime = 0;
                this.#pointSound.play();
                this.#score++; // Increment score
                this.updateScore(); // Update score display
            }
        };

        // Set interval for this specific pipe's movement
        let timerId = setInterval(() => movePipe(), 20);
        this.#pipes.push([pipe, timerId]); // Store pipe instance and its timer ID
    }

    /**
     * Clears all pipes from the game.
     */
    deletePipes() {
        this.#pipes.forEach((pipe) => {
            pipe[0].delete(); // Remove DOM elements
            clearInterval(pipe[1]); // Clear movement interval
        });
        this.#pipes = []; // Clear the array
    }

    /**
     * Controls the bird's flapping animation (CSS or sprite-based).
     */
    birdFlap() {
        if (!this.#isCollision && !this.#isGameOver) {
            // If a custom animated asset is active, call its sprite animation method
            if (this.#bird.getIsAnimatedAsset()) {
                this.#bird.animateSprite();
            } else {
                this.#bird.flap(); // Use original CSS class-based flap
            }
        }
    }

    /**
     * Updates the displayed score.
     */
    updateScore() {
        this.#scoreDOM.innerHTML = ""; // Clear current score display
        const scoreStr = this.#score.toString();
        for (const digit of scoreStr) {
            const img = document.createElement("img");
            img.src = `assets/images/${digit}.png`; // Use digit images
            this.#scoreDOM.appendChild(img);
        }
    }

    /**
     * Saves the current score as high score if it's greater.
     */
    saveScore() {
        console.log(`[App.js Debug]: saveScore called. Current #score: ${this.#score}, Current #highScore (before comparison): ${this.#highScore}`); // NEW LOG
        if (this.#score > this.#highScore) {
            this.#highScore = this.#score;
            localStorage.setItem("highScore", this.#score.toString()); // Ensure it's stored as a string
            console.log(`[App.js Debug]: New High Score Saved: ${this.#highScore}`);
        } else {
            console.log(`[App.js Debug]: Current Score (${this.#score}) not higher than High Score (${this.#highScore}). No save needed.`);
        }
    }

    /**
     * Retrieves the high score from local storage.
     * @returns {number} The stored high score or 0 if none.
     */
    getHighScore() {
        const storedHighScore = localStorage.getItem("highScore");
        console.log(`[App.js Debug]: getHighScore called. Raw stored value: '${storedHighScore}'`); // NEW LOG
        const highScore = storedHighScore ? parseInt(storedHighScore, 10) : 0;
        console.log(`[App.js Debug]: Retrieved High Score (parsed): ${highScore}`);
        return highScore;
    }

    /**
     * Displays the final score and high score on the game over screen.
     */
    showScore() {
        // Display current score
        this.#gameOverScoreDOM.innerHTML = "";
        const scoreStr = this.#score.toString();
        for (const digit of scoreStr) {
            const img = document.createElement("img");
            img.src = `assets/images/${digit}.png`;
            this.#gameOverScoreDOM.appendChild(img);
        }
        // Display high score
        this.#gameOverHighScoreDOM.innerHTML = "";
        // Check if #highScore is valid before calling toString
        if (typeof this.#highScore === 'number' && !isNaN(this.#highScore)) {
            const highScoreStr = this.#highScore.toString(); // This is line 552
            for (const digit of highScoreStr) {
                const img = document.createElement("img");
                img.src = `assets/images/${digit}.png`;
                this.#gameOverHighScoreDOM.appendChild(img);
            }
        } else {
            console.warn(`[App.js Error]: #highScore is not a valid number (${this.#highScore}). Cannot display.`);
            // Optionally display "0" or "N/A" if high score is invalid
            const img = document.createElement("img");
            img.src = `assets/images/0.png`;
            this.#gameOverHighScoreDOM.appendChild(img);
        }
    }

    /**
     * Triggers a visual flash effect and plays the "die" sound on collision.
     */
    triggerFlash() {
        this.#gameDisplayDOM.style.animation = "flash 0.15s";
        // die sound is now played in setGameOver to ensure it's not cut off by hit sound
        this.#gameDisplayDOM.addEventListener(
            "animationend",
            () => {
                this.#gameDisplayDOM.style.animation = "";
            },
            { once: true }
        );
    }

    /**
     * Handles keyboard controls for jumping and game state transitions.
     * @param {KeyboardEvent} e - The keyboard event object.
     */
    controls(e) {
        if (e.keyCode === 32) { // Spacebar (keydown event)
            if (
                this.#gameScreen === SCREENS.gameplay &&
                !this.#isCollision &&
                !this.#isGameOver
            ) {
                this.#lastTime = 0;
                this.#bird.jump();
                this.#flySound.play();
            } else if (this.#gameScreen === SCREENS.start) {
                // Transition from Start Menu to Gameplay
                clearInterval(this.#flapTimer); // Stop start menu bird flap
                this.#lastTime = 0;
                this.#bird.jump();
                this.#flySound.play();
                this.#startMenuDOM.className = "hidden";
                this.#startMenuTextDOM.className = "hidden";
                this.#gameScreen = SCREENS.gameplay;
                this.startGame();
            } else if (this.#gameScreen === SCREENS.gameOver && this.#isGameOver && this.#canRestart) {
                // Restart Game from Game Over screen ONLY IF canRestart is true
                this.#gameOverDOM.className = "hidden";
                this.#gameScreen = SCREENS.gameplay;
                this.#score = 0;
                this.#lastTime = 0;
                this.#bird.reset(BIRD_START_X, BIRD_START_Y); // Reset bird to initial state
                this.#bird.jump();
                this.#flySound.play();
                this.startGame();
            }
        }
    }
}
