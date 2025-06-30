import { Bird } from "./bird.js";
import { Pipe } from "./pipes.js";

// Game Constants
const GAME_LOOP_INTERVAL = 20;
const FLAP_INTERVAL = 100;
// Game State

// Bird
const BIRD_START_Y = 120;
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

// Game constants

// Collision
const PIPE_COLLISION_END_X = 160;
const PIPE_COLLISION_START_X = 260;
const BOTTOM_PIPE_COLLISION_Y = 288;
const TOP_PIPE_COLLISION_Y = -32;

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
  
  // THIS IS THE NEW PART: The "Message Listener"
  window.addEventListener("message", (event) => {
    const message = event.data;
    
    // Check if the message is the one we want
    if (message.type === 'UPDATE_SETTINGS') {
      // For debugging, let's log that we received it!
      console.log('Game received new settings from React:', message.payload);
      
      // Tell our game instance to use these new settings
      game.updateSettings(message.payload);
    }
     // ADD THIS 'ELSE IF' BLOCK
    else if (message.type === 'UPDATE_BIRD_IMAGE') {
      console.log('Game received new bird image from React');
      game.updateBirdImage(message.payload);
    }

  });

  // Start the game menu as before
  game.startMenu();
});

// Flappy Bird Game
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
  // ADD THESE TWO LINES HERE
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
  #gameScreen; // Start Menu, Gameplay, Game Over
  #dieSound;
  #diveSound;
  #hitSound;
  #pointSound;
  #flySound;

  constructor() {
    // DOM
    this.#gameDisplayDOM = document.querySelector(".game-container");
    this.#birdDOM = document.querySelector(".bird");
    this.#skyDOM = document.querySelector(".sky");
    this.#groundDOM = document.querySelector(".ground");
    this.#scoreDOM = document.getElementById("score-container");
    this.#startMenuDOM = document.getElementById("start-menu"); // Start Menu
    this.#startMenuTextDOM = document.getElementById("start-menu-text"); // Start Menu Text
    this.#gameOverDOM = document.getElementById("game-over"); // Game Over
    this.#gameOverScoreDOM = document.getElementById("score"); // Game Over Score
    this.#gameOverHighScoreDOM = document.getElementById("best-score"); // Game Over High Score

    // Game State
    this.#isGameOver = false;
    this.#isCollision = false;
    this.#lastTime = 0;
    this.#gameScreen = SCREENS.start;

    // Sounds
    this.#dieSound = new Audio("assets/sound/die.wav");
    this.#diveSound = new Audio("assets/sound/dive.wav");
    this.#hitSound = new Audio("assets/sound/hit.wav");
    this.#pointSound = new Audio("assets/sound/point.wav");
    this.#flySound = new Audio("assets/sound/fly.wav");
    // Preload Sounds
    this.#dieSound.preload = "auto";
    this.#diveSound.preload = "auto";
    this.#hitSound.preload = "auto";
    this.#pointSound.preload = "auto";
    this.#flySound.preload = "auto";
    // Set Volume
    this.#dieSound.volume = 0.5;
    this.#diveSound.volume = 0.5;
    this.#hitSound.volume = 0.3;
    this.#pointSound.volume = 0.2;
    this.#flySound.volume = 0.5;

    // Game Objects
    // Bird
    this.#pipes = [];
    //custom settings for -pipe sliderbar
    this.#pipeSpeed = PIPE_BASE_SPEED;
    this.#pipeGap = PIPE_GAP;
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
    // Bind Controls
    this.controls = this.controls.bind(this); // bind controls to game
    // Init Controls
    document.addEventListener("keyup", this.controls); // jump on spacebar
    // Scores
    this.#score = 0;
    this.#highScore = this.getHighScore();
  }
  // In class FlappyBird
  // In class FlappyBird
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
  // ADD THIS NEW METHOD
  updateBirdImage(imageDataUrl) {
    this.#bird.setImage(imageDataUrl);
  }

  // Start Menu
  startMenu() {
    // Show Start Menu
    this.#startMenuDOM.className = "start-menu-container ";
    // Bird Flap
    this.#flapTimer = setInterval(() => {
      this.birdFlap();
    }, FLAP_INTERVAL);
  }

  // Game Over
  setGameOver() {
    this.#isGameOver = true;
    // Stop Game Loop
    clearInterval(this.#gameLoopTimer);
    clearInterval(this.#pipeGenTimer);
    clearInterval(this.#flapTimer);
    // Stop Ground Movement
    this.#groundDOM.className = BASE_GROUND;
    // Hide Score Counter
    this.#scoreDOM.className = "hidden";
    // Save Score
    this.saveScore();
    // Show Game Over Screen
    this.#gameScreen = SCREENS.gameOver;
    this.#gameOverDOM.className = "game-over-container";
    // Show Scores
    this.showScore();
  }
  // Start Game
  startGame() {
    // Set game state
    if (this.#isGameOver) {
      this.#isCollision = false;
      this.#isGameOver = false;
      this.deletePipes();
      this.#lastTime = 0;
      this.#score = 0;
    }

    // Play Dive Sound
    this.#diveSound.play();

    // Ground Movement
    this.#groundDOM.className = GROUND_MOVING;
    // Show Score Counter
    this.#scoreDOM.className = "score";
    // Start Game Loop
    this.#gameLoopTimer = setInterval(
      () => this.gameLoop(),
      GAME_LOOP_INTERVAL
    );

    // Bird Flap
    this.#flapTimer = setInterval(() => {
      this.birdFlap();
    }, FLAP_INTERVAL);
    // Generate Pipes
    this.#pipeGenTimer = setInterval(() => this.generatePipes(), PIPE_GEN_TIME);
    // Start Ground Movement
    this.#groundDOM.className = GROUND_MOVING;
    // Score
  }

  // Game Loop
  gameLoop() {
    // Update Time
    this.#lastTime++;

    // Update Bird
    this.#bird.update(this.#lastTime);

    // Update Score
    this.updateScore();
    // check collision
    if (this.#bird.getPosY() <= 0) {
      if (!this.#isCollision) {
        this.setCollision();
      }
      this.setGameOver();
    }
  }

  setCollision() {
    // Play Hit Sound
    this.#hitSound.currentTime = 0;
    this.#hitSound.play();
    // Set Collision
    this.#isCollision = true;
    // Set Bird Speed to 0 on collision
    this.#bird.setZeroSpeed();
    // Stop Ground Movement
    this.#groundDOM.className = BASE_GROUND;
    // Flash white screen on collision
    this.triggerFlash();
  }

  // Generate Pipes
  generatePipes() {
    // Create Pipe
    let pipe = new Pipe(
      PIPE_START_X,
      PIPE_BASE_Y,
      this.#pipeGap, // Use our custom variable
      this.#skyDOM,
      this.#pipeSpeed, // Use our custom variable
      PIPE_COLLISION_END_X,
      PIPE_COLLISION_START_X,
      BOTTOM_PIPE_COLLISION_Y,
      TOP_PIPE_COLLISION_Y
    );
    pipe.draw();

    // Pipe Movement
    const movePipe = () => {
      let bird = this.#bird.getBirdPos();
      // Update Pipe Position
      if (!this.#isCollision && !this.#isGameOver) {
        pipe.update();
        if (pipe.checkCollision(bird.y)) {
          this.setCollision();
        }
      }

      // Check if pipe is off screen
      if (pipe.getPosX() === PIPE_SCREEN_END) {
        pipe.delete();
        clearInterval(timerId);
      }
      // Check if bird has passed pipe
      if (pipe.hasPassed()) {
        // Play Point Sound
        this.#pointSound.currentTime = 0;
        this.#pointSound.play();
        // Update Score
        this.#score++;
        this.updateScore();
      }
    };

    let timerId = setInterval(() => movePipe(), 20);
    this.#pipes.push([pipe, timerId]);
    //setTimeout(() => this.generatePipes(), PIPE_GEN_TIME);
  }
  // Delete Pipes
  deletePipes() {
    // Delete Pipe from Scene
    this.#pipes.forEach((pipe) => pipe[0].delete());
    // Delete Pipe Timer
    this.#pipes.forEach((pipe) => clearInterval(pipe[1]));
    // Clear Pipes Array
    this.#pipes = [];
  }

  // Effects
  // Bird Flap
  birdFlap() {
    if (!this.#isCollision && !this.#isGameOver) {
      this.#bird.flap();
    }
  }
  // Score Update
  updateScore() {
    // Update Score
    this.#scoreDOM.innerHTML = "";
    const scoreStr = this.#score.toString();
    for (const digit of scoreStr) {
      const img = document.createElement("img");
      img.src = `assets/images/${digit}.png`; // Set the source to the correct image
      this.#scoreDOM.appendChild(img);
    }
  }

  // Save Score
  saveScore() {
    if (this.#score > this.#highScore) {
      this.#highScore = this.#score;
      localStorage.setItem("highScore", this.#score);
    }
  }

  // Get High Score
  getHighScore() {
    return localStorage.getItem("highScore") || 0;
  }
  // Show Score
  showScore() {
    // Show Score
    this.#gameOverScoreDOM.innerHTML = "";
    const scoreStr = this.#score.toString();
    for (const digit of scoreStr) {
      const img = document.createElement("img");
      img.src = `assets/images/${digit}.png`; // Set the source to the correct image
      this.#gameOverScoreDOM.appendChild(img);
    }
    // Show High Score
    this.#gameOverHighScoreDOM.innerHTML = "";
    console.log(this.#highScore);
    const highScoreStr = this.#highScore.toString();
    for (const digit of highScoreStr) {
      const img = document.createElement("img");
      img.src = `assets/images/${digit}.png`; // Set the source to the correct image
      this.#gameOverHighScoreDOM.appendChild(img);
    }
  }
  // Screen Flash and play die sound
  triggerFlash() {
    this.#gameDisplayDOM.style.animation = "flash 0.15s"; // Duration of 0.5s is an example, adjust as needed
    this.#dieSound.currentTime = 0; // Reset the sound to the beginning
    this.#dieSound.play();
    // Remove the animation style after it's complete
    this.#gameDisplayDOM.addEventListener(
      "animationend",
      () => {
        this.#gameDisplayDOM.style.animation = "";
      },
      { once: true }
    );
  }
  // Game Controls
  controls(e) {
    // Jump
    if (e.keyCode === 32) {
      // Gamplay Controls
      if (
        this.#gameScreen === SCREENS.gameplay &&
        !this.#isCollision &&
        !this.#isGameOver
      ) {
        this.#lastTime = 0;
        this.#bird.jump();
        this.#flySound.play();
      }
      // Start Menu Controls
      if (this.#gameScreen === SCREENS.start) {
        clearInterval(this.#flapTimer); // stop bird flap
        // Setup Game Screen
        this.#lastTime = 0;
        this.#bird.jump();
        this.#flySound.play();
        this.#startMenuDOM.className = "hidden";
        this.#startMenuTextDOM.className = "hidden";
        this.#gameScreen = SCREENS.gameplay;
        // Start Game
        this.startGame();
      }
      // Restart Game
      if (this.#gameScreen === SCREENS.gameOver && this.#isGameOver) {
        this.#gameOverDOM.className = "hidden";
        this.#gameScreen = SCREENS.gameplay;
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