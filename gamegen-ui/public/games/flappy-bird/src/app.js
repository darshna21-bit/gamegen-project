// gamegen-ui/public/games/flappy-bird/src/app.js

import { Bird } from "./bird.js";
import { Pipe } from "./pipes.js";

// --- NEW: EXPORTED GAME DATA INJECTION POINT ---
// These variables will be defined by the backend when the game is exported.
// They will override the default constants below if the game is run from an exported ZIP.
// If not exported (i.e., running directly in development), these will be undefined,
// and the defaults will be used.
// The backend will prepend 'const EXPORTED_GAME_PARAMETERS = {...};' and
// 'const EXPORTED_CURRENT_ASSETS = {...};' here.
// --- END NEW INJECTION POINT ---


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
// MODIFIED: Use EXPORTED_GAME_PARAMETERS for PIPE_GAP if available, else default
const PIPE_GAP = (typeof EXPORTED_GAME_PARAMETERS !== 'undefined' && EXPORTED_GAME_PARAMETERS.pipeGap !== undefined) 
                 ? EXPORTED_GAME_PARAMETERS.pipeGap 
                 : 400; 
const PIPE_GEN_TIME = 2000;
const PIPE_START_X = 500;
const PIPE_BASE_Y = -200;
// MODIFIED: Use EXPORTED_GAME_PARAMETERS for PIPE_BASE_SPEED if available, else default
const PIPE_BASE_SPEED = (typeof EXPORTED_GAME_PARAMETERS !== 'undefined' && EXPORTED_GAME_PARAMETERS.speed !== undefined) 
                        ? EXPORTED_GAME_PARAMETERS.speed 
                        : 3; 
const PIPE_SCREEN_END = -60;

// World
// MODIFIED: Use EXPORTED_GAME_PARAMETERS for GRAVITY if available, else default
const GRAVITY = (typeof EXPORTED_GAME_PARAMETERS !== 'undefined' && EXPORTED_GAME_PARAMETERS.gravity !== undefined) 
                ? EXPORTED_GAME_PARAMETERS.gravity 
                : 0.4; 

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
    // This part is UNCHANGED and only relevant when running in the editor iframe.
    // It allows live updates from the GameEditor UI.
    window.addEventListener("message", (event) => {
        const { type, key, value, assetType, url, data } = event.data;

        console.log(`[Flappy Bird Game]: Received message - Type: ${type}, Key: ${key}, Value: ${value}, AssetType: ${assetType}, URL: ${url}, Data:`, data);

        if (type === 'UPDATE_PARAM') {
            if (key === 'gravity') {
                game.updateSettings({ gravity: value });
            } else if (key === 'speed') {
                game.updateSettings({ speed: value });
            } else if (key === 'pipeGap') {
                game.updateSettings({ pipeGap: value });
            }
        }
        else if (type === 'UPDATE_ASSET') {
            switch (assetType) {
                case 'character':
                    game.updateBirdImage(data || { url: url, isAnimated: false });
                    game.resetFlapAnimation(); 
                    break;
                case 'obstacle':
                    game.updatePipeImage(data && data.imageUrl ? data.imageUrl : url);
                    break;
                case 'background':
                    game.updateBackgroundImage(data && data.imageUrl ? data.imageUrl : url);
                    break;
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
    #flapTimer;

    // Game State
    #isGameOver;
    #isCollision;
    #lastTime;
    #score;
    #highScore;
    #gameScreen;
    #canRestart;

    // Sounds
    #dieSound;
    #diveSound;
    #hitSound;
    #pointSound;
    #flySound;

    // MODIFIED: Initialize #currentPipeImageUrl with EXPORTED_CURRENT_ASSETS.obstacle if available, else default
    #currentPipeImageUrl = (typeof EXPORTED_CURRENT_ASSETS !== 'undefined' && EXPORTED_CURRENT_ASSETS.obstacle) 
                            ? EXPORTED_CURRENT_ASSETS.obstacle 
                            : 'assets/images/pipe.png'; 
    // MODIFIED: Initialize #currentBackgroundImageUrl with EXPORTED_CURRENT_ASSETS.background if available, else default
    #currentBackgroundImageUrl = (typeof EXPORTED_CURRENT_ASSETS !== 'undefined' && EXPORTED_CURRENT_ASSETS.background) 
                                ? EXPORTED_CURRENT_ASSETS.background 
                                : 'assets/images/background.png'; 

    constructor() {
        // DOM Element References (UNCHANGED)
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

        // Initialize Game State (UNCHANGED)
        this.#isGameOver = false;
        this.#isCollision = false;
        this.#lastTime = 0;
        this.#gameScreen = SCREENS.start;
        this.#canRestart = true;

        // Load Sounds (UNCHANGED)
        this.#dieSound = new Audio("assets/sound/die.wav");
        this.#diveSound = new Audio("assets/sound/dive.wav");
        this.#hitSound = new Audio("assets/sound/hit.wav");
        this.#pointSound = new Audio("assets/sound/point.wav");
        this.#flySound = new Audio("assets/sound/fly.wav");

        // Preload Sounds for better performance (UNCHANGED)
        this.#dieSound.preload = "auto";
        this.#diveSound.preload = "auto";
        this.#hitSound.preload = "auto";
        this.#pointSound.preload = "auto";
        this.#flySound.preload = "auto";

        // Set Sound Volumes (UNCHANGED)
        this.#dieSound.volume = 0.5;
        this.#diveSound.volume = 0.5;
        this.#hitSound.volume = 0.3;
        this.#pointSound.volume = 0.2;
        this.#flySound.volume = 0.5;

        // Initialize Game Objects
        // These now use the constants defined above, which are now dynamic based on EXPORTED_GAME_PARAMETERS
        this.#pipes = [];
        this.#pipeSpeed = PIPE_BASE_SPEED; 
        this.#pipeGap = PIPE_GAP; 

        // Initialize the Bird object
        this.#bird = new Bird(
            BIRD_START_X,
            BIRD_START_Y,
            GRAVITY, // Now uses the dynamic GRAVITY constant
            LIFT,
            JUMP_HEIGHT,
            MAX_HEIGHT,
            MAX_ROTATION,
            this.#birdDOM,
            this.#flySound
        );
        // MODIFIED: Explicitly set the bird image based on EXPORTED_CURRENT_ASSETS.character if available
        this.#bird.setImage({
            url: (typeof EXPORTED_CURRENT_ASSETS !== 'undefined' && EXPORTED_CURRENT_ASSETS.character) 
                 ? EXPORTED_CURRENT_ASSETS.character 
                 : 'assets/images/yellowbird-midflap.png',
            isAnimated: false // Default bird is not sprite animated, uses CSS classes
        });
        this.#bird.update(0); // This applies BIRD_START_Y to its 'bottom' style

        // MODIFIED: Apply initial background based on #currentBackgroundImageUrl
        this.applyBackgroundImage(this.#currentBackgroundImageUrl); 

        // Initialize Scores (UNCHANGED)
        this.#score = 0;
        this.#highScore = this.getHighScore();
        console.log(`[App.js Debug]: Constructor - Initial #highScore after getHighScore(): ${this.#highScore}`);

        // Bind event handlers to the current instance (UNCHANGED)
        this.controls = this.controls.bind(this);
        document.addEventListener("keydown", this.controls);
        document.addEventListener("keyup", this.handleKeyUp);
    }

    /**
     * Handles keyup events, specifically for allowing game restart after game over. (UNCHANGED)
     */
    handleKeyUp = (e) => { 
        if (e.keyCode === 32) {
            if (this.#gameScreen === SCREENS.gameOver) {
                this.#canRestart = true;
            }
        }
    }

    /**
     * Updates game settings (gravity, pipe speed, pipe gap) based on input from the React UI. (UNCHANGED)
     * This method is only used for live updates from the editor.
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
     * Updates the bird's image or animation based on asset data from the React UI. (UNCHANGED)
     * This method is only used for live updates from the editor.
     */
    updateBirdImage(assetData) {
        this.#bird.setImage(assetData);
        this.#bird.reset(BIRD_START_X, BIRD_START_Y);
        this.#bird.update(0);
    }

    /**
     * Updates the image URL for newly generated pipes. (UNCHANGED)
     * This method is only used for live updates from the editor.
     */
    updatePipeImage(imageUrl) {
        this.#currentPipeImageUrl = imageUrl;
        this.#pipes.forEach(pipeEntry => {
            pipeEntry[0].setImage(imageUrl);
        });
    }

    /**
     * Updates the background image of the game container. (UNCHANGED)
     * This method is only used for live updates from the editor.
     */
    updateBackgroundImage(imageUrl) {
        this.#currentBackgroundImageUrl = imageUrl;
        this.applyBackgroundImage(imageUrl);
    }

    /**
     * Applies the background image to the #skyDOM. (UNCHANGED)
     */
    applyBackgroundImage(imageUrl) {
        this.#skyDOM.style.backgroundImage = `url(${imageUrl})`;
        this.#skyDOM.style.backgroundSize = 'cover';
        this.#skyDOM.style.backgroundRepeat = 'no-repeat';
        this.#skyDOM.style.backgroundPosition = 'center';
    }

    /**
     * Resets and re-initializes the bird's flapping animation based on its current asset state. (UNCHANGED)
     */
    resetFlapAnimation() {
        clearInterval(this.#flapTimer);
        this.#flapTimer = setInterval(() => {
            if (this.#bird.getIsAnimatedAsset()) {
                this.#bird.animateSprite();
            } else {
                this.#bird.flap();
            }
        }, FLAP_INTERVAL);
    }

    /**
     * Displays the start menu and initializes the bird's flapping animation. (UNCHANGED)
     */
    startMenu() {
        this.#startMenuDOM.className = "start-menu-container ";
        this.resetFlapAnimation();
    }

    /**
     * Handles game over state: stops game loops, updates UI, saves score. (UNCHANGED)
     */
    setGameOver() {
        this.#isGameOver = true;
        this.#canRestart = false;
        clearInterval(this.#gameLoopTimer);
        clearInterval(this.#pipeGenTimer);
        clearInterval(this.#flapTimer);
        this.#groundDOM.className = BASE_GROUND;
        this.#scoreDOM.className = "hidden";
        this.saveScore();
        this.#gameScreen = SCREENS.gameOver;
        this.#gameOverDOM.className = "game-over-container";
        this.showScore();
        setTimeout(() => {
            this.#dieSound.currentTime = 0;
            this.#dieSound.play();
        }, 100);
    }

    /**
     * Initiates the game, resetting state if necessary. (UNCHANGED)
     */
    startGame() {
        if (this.#isGameOver) {
            this.#isCollision = false;
            this.#isGameOver = false;
            this.deletePipes();
            this.#lastTime = 0;
            this.#score = 0;
        }

        this.#diveSound.play();
        this.#groundDOM.className = GROUND_MOVING;
        this.#scoreDOM.className = "score";
        this.#gameLoopTimer = setInterval(
            () => this.gameLoop(),
            GAME_LOOP_INTERVAL
        );

        this.#bird.reset(BIRD_START_X, BIRD_START_Y);
        this.#bird.update(0);
        this.resetFlapAnimation();

        this.#pipeGenTimer = setInterval(() => this.generatePipes(), PIPE_GEN_TIME);
        this.#gameScreen = SCREENS.gameplay;
    }

    /**
     * The main game loop, called repeatedly to update game state. (UNCHANGED)
     */
    gameLoop() {
        this.#lastTime++;
        this.#bird.update(this.#lastTime);
        this.updateScore();
        if (this.#bird.getPosY() <= 0) {
            if (!this.#isCollision) {
                this.setCollision();
            }
            this.setGameOver();
        }
    }

    /**
     * Handles collision events (bird hitting ground or pipes). (UNCHANGED)
     */
    setCollision() {
        this.#hitSound.currentTime = 0;
        this.#hitSound.play();
        this.#isCollision = true;
        this.#bird.setZeroSpeed();
        this.#groundDOM.className = BASE_GROUND;
        this.triggerFlash();
    }

    /**
     * Creates and manages new pipes. (UNCHANGED)
     */
    generatePipes() {
        let pipe = new Pipe(
            PIPE_START_X,
            PIPE_BASE_Y,
            this.#pipeGap,
            this.#skyDOM,
            this.#pipeSpeed,
        );

        // MODIFIED: Apply the current custom pipe image if available
        // This will use #currentPipeImageUrl which is set in constructor (from export) or by updatePipeImage (from editor)
        if (this.#currentPipeImageUrl) {
            pipe.setImage(this.#currentPipeImageUrl);
        }

        pipe.draw();

        const movePipe = () => {
            if (!this.#isCollision && !this.#isGameOver) {
                pipe.update();
                if (pipe.checkCollision(this.#bird)) {
                    console.log("[App.js Debug]: Collision detected by pipe.checkCollision! Triggering game over.");
                    this.setCollision();
                    this.setGameOver();
                }
            }

            if (pipe.getPosX() === PIPE_SCREEN_END) {
                pipe.delete();
                clearInterval(timerId);
            }
            if (pipe.hasPassed()) {
                this.#pointSound.currentTime = 0;
                this.#pointSound.play();
                this.#score++;
                this.updateScore();
            }
        };

        let timerId = setInterval(() => movePipe(), 20);
        this.#pipes.push([pipe, timerId]);
    }

    /**
     * Clears all pipes from the game. (UNCHANGED)
     */
    deletePipes() {
        this.#pipes.forEach((pipe) => {
            pipe[0].delete();
            clearInterval(pipe[1]);
        });
        this.#pipes = [];
    }

    /**
     * Controls the bird's flapping animation (CSS or sprite-based). (UNCHANGED)
     */
    birdFlap() {
        if (!this.#isCollision && !this.#isGameOver) {
            if (this.#bird.getIsAnimatedAsset()) {
                this.#bird.animateSprite();
            } else {
                this.#bird.flap();
            }
        }
    }

    /**
     * Updates the displayed score. (UNCHANGED)
     */
    updateScore() {
        this.#scoreDOM.innerHTML = "";
        const scoreStr = this.#score.toString();
        for (const digit of scoreStr) {
            const img = document.createElement("img");
            img.src = `assets/images/${digit}.png`;
            this.#scoreDOM.appendChild(img);
        }
    }

    /**
     * Saves the current score as high score if it's greater. (UNCHANGED)
     */
    saveScore() {
        console.log(`[App.js Debug]: saveScore called. Current #score: ${this.#score}, Current #highScore (before comparison): ${this.#highScore}`);
        if (this.#score > this.#highScore) {
            this.#highScore = this.#score;
            localStorage.setItem("highScore", this.#score.toString());
            console.log(`[App.js Debug]: New High Score Saved: ${this.#highScore}`);
        } else {
            console.log(`[App.js Debug]: Current Score (${this.#score}) not higher than High Score (${this.#highScore}). No save needed.`);
        }
    }

    /**
     * Retrieves the high score from local storage. (UNCHANGED)
     */
    getHighScore() {
        const storedHighScore = localStorage.getItem("highScore");
        console.log(`[App.js Debug]: getHighScore called. Raw stored value: '${storedHighScore}'`);
        const highScore = storedHighScore ? parseInt(storedHighScore, 10) : 0;
        console.log(`[App.js Debug]: Retrieved High Score (parsed): ${highScore}`);
        return highScore;
    }

    /**
     * Displays the final score and high score on the game over screen. (UNCHANGED)
     */
    showScore() {
        this.#gameOverScoreDOM.innerHTML = "";
        const scoreStr = this.#score.toString();
        for (const digit of scoreStr) {
            const img = document.createElement("img");
            img.src = `assets/images/${digit}.png`;
            this.#gameOverScoreDOM.appendChild(img);
        }
        this.#gameOverHighScoreDOM.innerHTML = "";
        if (typeof this.#highScore === 'number' && !isNaN(this.#highScore)) {
            const highScoreStr = this.#highScore.toString();
            for (const digit of highScoreStr) {
                const img = document.createElement("img");
                img.src = `assets/images/${digit}.png`;
                this.#gameOverHighScoreDOM.appendChild(img);
            }
        } else {
            console.warn(`[App.js Error]: #highScore is not a valid number (${this.#highScore}). Cannot display.`);
            const img = document.createElement("img");
            img.src = `assets/images/0.png`;
            this.#gameOverHighScoreDOM.appendChild(img);
        }
    }

    /**
     * Triggers a visual flash effect and plays the "die" sound on collision. (UNCHANGED)
     */
    triggerFlash() {
        this.#gameDisplayDOM.style.animation = "flash 0.15s";
        this.#gameDisplayDOM.addEventListener(
            "animationend",
            () => {
                this.#gameDisplayDOM.style.animation = "";
            },
            { once: true }
        );
    }

    /**
     * Handles keyboard controls for jumping and game state transitions. (UNCHANGED)
     */
    controls(e) {
        if (e.keyCode === 32) {
            if (
                this.#gameScreen === SCREENS.gameplay &&
                !this.#isCollision &&
                !this.#isGameOver
            ) {
                this.#lastTime = 0;
                this.#bird.jump();
                this.#flySound.play();
            } else if (this.#gameScreen === SCREENS.start) {
                clearInterval(this.#flapTimer);
                this.#lastTime = 0;
                this.#bird.jump();
                this.#flySound.play();
                this.#startMenuDOM.className = "hidden";
                this.#startMenuTextDOM.className = "hidden";
                this.startGame(); // Start game logic
            } else if (this.#gameScreen === SCREENS.gameOver && this.#isGameOver && this.#canRestart) {
                this.#gameOverDOM.className = "hidden";
                // No need to set gameScreen to gameplay here, startGame does it
                this.#score = 0;
                this.#lastTime = 0;
                this.#bird.reset(BIRD_START_X, BIRD_START_Y);
                this.#bird.jump();
                this.#flySound.play();
                this.startGame();
            }
        }
    }
}