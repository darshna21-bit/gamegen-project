const start_sfx = new Audio('./css/start.mp3');
const hit_sfx = new Audio('./css/hit.mp3');
const hit2_sfx = new Audio('./css/hit2.mp3');
const peep_sfx = new Audio('./css/peep.mp3');
const ding_sfx = new Audio('./css/ding.mp3');
const pam_sfx = new Audio('./css/pam.mp3');
const pum_sfx = new Audio('./css/pum.mp3');
const holes = document.querySelectorAll('.hole');
const moles = document.querySelectorAll('.mole'); // Corrected selector from '.moles' to '.mole'

const counter = document.querySelector('.score span');
const start = document.querySelector('.start');
const timer = document.querySelector('.time span');

// --- NEW/MODIFIED: Best Score DOM Element ---
const bestScoreDOM = document.querySelector('.best-score span'); // Select the best score span

const velocityLevelDOM = document.querySelector('.velocity-level');
const timeLevelDOM = document.querySelector('.time-level');
const volumeLevelDOM = document.querySelector('.volume-level');


// --- NEW: Global variable to store current generated mole image URL ---
// Default mole image path: Set to the correct relative path based on your file structure
let currentMoleImageUrl = './css/mole.png';
// Default ground image path: Set to the correct relative path based on your file structure
let currentGroundImageUrl = './css/background.jpg'; // Assuming your background image is named background.jpg

let velocity_level = 1; // Controls mole spawn time via getRandomTime()
let time_level = 1;     // Controls game duration via getTime()
let volume_level = 1;
let count = 0; // Current score
let bestScore = 0; // Best score
let lastHole;
let time=0;
let timeUp;
let started = false;

// --- MODIFIED: Declare 'countdown' globally so it can be cleared ---
let countdown;
let gameRestartTimer; // Timer for handling game restarts after game over.

// --- NEW: DOM element selectors for our simplified game over screen ---
const simpleGameOverDOM = document.getElementById('simple-game-over');
const simpleRetryButton = document.getElementById('simple-retry-button');
const gameContainer = document.querySelector('.container'); // Main game view


// --- MODIFIED Event Listeners ---
start.addEventListener('click', initGame); // Changed to initGame
holes.forEach(hole => hole.addEventListener('mousedown', up));
holes.forEach(hole => hole.addEventListener('touchstart', up));
velocityLevelDOM.addEventListener('click', changeVelocityLevel); // Still useful for internal game settings
timeLevelDOM.addEventListener('click', changeTimeLevel);     // Still useful for internal game settings
volumeLevelDOM.addEventListener('click', changeVolumeLevel);

// --- NEW: Event Listener for the simplified retry button ---
simpleRetryButton.addEventListener('click', () => {
    // Hide game over screen
    simpleGameOverDOM.style.display = 'none';
    // Show main game view
    gameContainer.style.display = 'block'; // Or 'flex' if that's its original display style

    // Reset game state to a pre-start condition, waiting for START button
    resetGame();
});

// --- NEW: Initial setup on page load ---
document.addEventListener('DOMContentLoaded', () => {
    // Load best score from local storage
    bestScore = localStorage.getItem('whackAMoleBestScore') || 0;
    bestScoreDOM.textContent = bestScore; // Display initial best score

    // Ensure score and timer are initially zeroed out and visible
    counter.textContent = '0';
    timer.textContent = `${getTime()}`; // Show default time based on current time_level
    
    // Directly apply default mole and ground images on DOMContentLoaded
    // Use the same paths as the currentMoleImageUrl and currentGroundImageUrl global variables
    moles.forEach(mole => {
        mole.style.backgroundImage = `url(${currentMoleImageUrl})`;
        mole.style.backgroundSize = 'contain';
        mole.style.backgroundRepeat = 'no-repeat';
        mole.style.backgroundPosition = 'center';
    });
    document.body.style.backgroundImage = `url(${currentGroundImageUrl})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundPosition = 'center';

    console.log(`[Whack-A-Mole]: Initial mole character image set to: ${currentMoleImageUrl}`);
    console.log(`[Whack-A-Mole]: Initial ground image set to: ${currentGroundImageUrl}`);
    
    // Ensure holes are not 'up'
    holes.forEach(hole => hole.classList.remove('up'));

    // The game will wait for the 'START' button click from now on.
    // So no auto-start here.
});


// Functions
function up(e) {
  e.preventDefault();
  // Only register hit if game is started and mole is up
  if (started && this.classList.contains('up')) { // --- MODIFIED: Added `started` check ---
    this.classList.remove('up'); // Hide mole immediately on hit

    if(volume_level) {
      const x = Math.round(Math.random() * (2 - 1) + 1);
      if(x === 1) {
        hit_sfx.currentTime = 0;
        hit_sfx.play();
      } else {
        hit2_sfx.currentTime = 0.1;
        hit2_sfx.play();
      }
    }
    count++;
    counter.textContent = `${count}`; // Update current score
  }
}

function peep() {
  const randomTime = getRandomTime(); // This uses the current `velocity_level`
  const hole = randomHole(holes);
  hole.classList.add('up');

  // --- MODIFIED: Apply the current generated mole image when it pops up ---
  const moleDiv = hole.querySelector('.mole'); // Get the mole div inside the hole
  if (moleDiv) {
      moleDiv.style.backgroundImage = `url(${currentMoleImageUrl})`; // Use the global variable
      moleDiv.style.backgroundSize = 'contain';
      moleDiv.style.backgroundRepeat = 'no-repeat';
      moleDiv.style.backgroundPosition = 'center';
      moleDiv.style.display = 'block'; // Ensure mole is visible when it pops up
      moleDiv.style.opacity = '1';
  }

  if(volume_level) {
    peep_sfx.currentTime = 0;
    peep_sfx.play();
  }
  setTimeout(() => {
        hole.classList.remove('up');
        if (moleDiv) { // Ensure moleDiv exists before trying to hide it
            moleDiv.style.display = 'none';
        }
        if (!timeUp) peep();
    }, randomTime);
}

function randomHole(holes) {
  const index = Math.floor(Math.random() * holes.length);
  const hole = holes[index];
  if (lastHole === hole) {
    return randomHole(holes);
  }
  lastHole = hole;
  return hole;
}

// --- MODIFIED: Renamed startTime to initGame and then call startGame to begin timer/moles ---
function initGame() {
    if (started === false) { // Only allow starting if not already started
        if(volume_level) {
            start_sfx.currentTime = 0.125;
            start_sfx.play();
        }
        resetGame(); // Ensure game state is clean
        started = true; // Set started to true for actual game loop
        startGameplayLoop(); // Start the game logic
    }
}

// --- NEW: Function to handle the actual game loop start (timer, moles) ---
function startGameplayLoop() {
    peep(); // Start moles popping

    // Assign to the global 'countdown' variable
    countdown = setInterval(() => {
        time++;
        timer.textContent = `${getTime() - time}`;
        (getTime() - time === 3 || getTime() - time === 1) ? timer.style.color = '#f33' : timer.style.color = 'inherit'

        if (time >= getTime()) {
            clearInterval(countdown);
            timeUp = true;
            started = false; // Game is over
            if(volume_level) {
                ding_sfx.currentTime = 0
                ding_sfx.play();
            }
            // Trigger game over screen
            setTimeout(() => {
                scoreboardUpdater();
            }, 1000);
        }
    }, 1000);
}


// --- NEW: Function to reset all game state to initial values ---
function resetGame() {
    clearInterval(countdown); // Clear any running countdown
    clearTimeout(gameRestartTimer); // Clear any pending game over timers

    count = 0;
    counter.textContent = '0'; // Reset score display

    time = 0;
    timeUp = false;
    started = false; // Ensure game is not 'started' until user clicks START

    timer.textContent = `${getTime()}`; // Reset timer display based on current time_level

    // Hide all moles and ensure holes are not 'up'
    holes.forEach(hole => hole.classList.remove('up'));
    moles.forEach(mole => {
        mole.style.backgroundImage = `url(${currentMoleImageUrl})`; // Re-apply current mole image
        mole.style.display = 'none'; // Ensure moles are hidden when holes are down
        mole.style.opacity = '1';
    });

    // Save score if it's a new best
    if (count > bestScore) {
        bestScore = count;
        localStorage.setItem('whackAMoleBestScore', bestScore);
        bestScoreDOM.textContent = bestScore;
    }
    // Update best score display even if not a new best (to show current best)
    bestScoreDOM.textContent = localStorage.getItem('whackAMoleBestScore') || 0;
}


// --- MODIFIED: scoreboardUpdater now just handles showing game over ---
function scoreboardUpdater() {
  // Hide main game view
  gameContainer.style.display = 'none';
  // Show our simple game over div
  simpleGameOverDOM.style.display = 'block';

  // Save final score if it's a new best
  if (count > bestScore) {
    bestScore = count;
    localStorage.setItem('whackAMoleBestScore', bestScore);
    bestScoreDOM.textContent = bestScore; // Update display immediately
  }
}

function getRandomTime() {
    switch (velocity_level) {
        case 0: // "Simple" (Slower moles)
            return Math.round(Math.random() * (2500 - 1500) + 1500);
        case 1: // "Medium" (Medium moles)
            return Math.round(Math.random() * (1500 - 700) + 700);
        case 2: // "Hard" (Faster moles)
            return Math.round(Math.random() * (700 - 300) + 300);
        default:
            return Math.round(Math.random() * (1500 - 700) + 700);
    }
}

function getTime() {
    switch (time_level) {
        case 0: // "Simple" (Longer game duration)
            return 90;
        case 1: // "Medium" (Medium game duration)
            return 60;
        case 2: // "Hard" (Shorter game duration)
            return 30;
        default:
            return 60;
    }
}

// These functions are for the game's internal difficulty buttons which we are bypassing
// They are kept here because `getRandomTime` and `getTime` still use `velocity_level` and `time_level`
function changeVelocityLevel(e, n) {
  const element = velocityLevelDOM.children[1]
  const currentLevel = n || +element.textContent
  if(volume_level) {
    start_sfx.currentTime = 0.125;
    start_sfx.play();
  }
  switch (currentLevel) {
    case 1:
      element.classList.remove('easy')
      element.classList.add('normal')
      element.textContent = '2'
      velocity_level = 1
      break;
    case 2:
      element.classList.remove('normal')
      element.classList.add('hard')
      element.textContent = '3'
      velocity_level = 2
      break;
    case 3: // This case is for the game's own 'Easy' button
      element.classList.remove('hard')
      element.classList.add('easy')
      element.textContent = '1'
      velocity_level = 0
      break;
    default:
      element.textContent = '2'
      velocity_level = 1
      break;
  }
}
function changeTimeLevel(e, n) {
  const element = timeLevelDOM.children[1]
  const currentLevel = n || element.textContent
  if(volume_level) {
    start_sfx.currentTime = 0.125;
    start_sfx.play();
  }
  switch (currentLevel) {
    case '30':
      element.classList.remove('easy')
      element.classList.add('normal')
      element.textContent = '10'
      time_level = 1
      break;
    case '10':
      element.classList.remove('normal')
      element.classList.add('hard')
      element.textContent = '5'
      time_level = 2
      break;
    case '5':
      element.classList.remove('hard')
      element.classList.add('easy')
      element.textContent = '30'
      time_level = 0
      break;
    default:
      element.textContent = '10'
      time_level = 1
      break;
  }
}
function changeVolumeLevel() {
    const element = volumeLevelDOM.children[1]
    const currentLevel = element.textContent
    switch (currentLevel) {
      case 'X':
          element.textContent = ''
          volume_level = 1
          break;
        default:
          element.textContent = 'X'
          volume_level = 0
          break;
    }
    if(volume_level) {
      start_sfx.currentTime = 0.125;
      start_sfx.play();
    }
}
// --- NEW HELPER FUNCTIONS FOR ASSET APPLICATION ---
function applyMoleAsset(url) {
    // Get the current background image URL from the first mole element
    const currentAppliedUrl = moles.length > 0 ? moles[0].style.backgroundImage : '';

    // Only update if a valid URL is provided AND it's different from the currently applied one.
    if (url && typeof url === 'string' && url.trim() !== '') {
        // Normalize URLs for comparison (remove 'url("")' and quotes)
        const normalizedNewUrl = url.replace(/url\(["']?([^"']*)["']?\)/, '$1');
        const normalizedCurrentUrl = currentAppliedUrl.replace(/url\(["']?([^"']*)["']?\)/, '$1');

        if (normalizedNewUrl !== normalizedCurrentUrl) {
            currentMoleImageUrl = url;
            moles.forEach(mole => {
                mole.style.backgroundImage = `url(${currentMoleImageUrl})`;
                mole.style.backgroundSize = 'contain';
                mole.style.backgroundRepeat = 'no-repeat';
                mole.style.backgroundPosition = 'center';
            });
            console.log(`[Whack-A-Mole]: Applied mole character image: ${currentMoleImageUrl}`);
        } else {
            console.log(`[Whack-A-Mole]: Mole image already set to ${url}. Skipping re-application.`);
        }
    } else {
        // Revert to default mole image if an invalid URL is passed
        const defaultUrl = './css/mole.png'; // Corrected default path to be relative to script.js
        const normalizedDefaultUrl = defaultUrl.replace(/url\(["']?([^"']*)["']?\)/, '$1');
        const normalizedCurrentUrl = currentAppliedUrl.replace(/url\(["']?([^"']*)["']?\)/, '$1');

        if (normalizedDefaultUrl !== normalizedCurrentUrl) {
            currentMoleImageUrl = defaultUrl;
            moles.forEach(mole => {
                mole.style.backgroundImage = `url(${currentMoleImageUrl})`;
                mole.style.backgroundSize = 'contain';
                mole.style.backgroundRepeat = 'no-repeat';
                mole.style.backgroundPosition = 'center';
            });
            console.warn("[Whack-A-Mole]: Invalid mole image URL received. Reverting to default.");
        } else {
            console.log(`[Whack-A-Mole]: Invalid mole URL received, but default (${defaultUrl}) is already applied. Skipping re-application.`);
        }
    }
}

function applyGroundAsset(url) {
    // Get the current background image URL from the body style
    const currentAppliedUrl = document.body.style.backgroundImage;

    // Only update if a valid URL is provided AND it's different from the currently applied one.
    if (url && typeof url === 'string' && url.trim() !== '') {
        // Normalize URLs for comparison (remove 'url("")' and quotes)
        const normalizedNewUrl = url.replace(/url\(["']?([^"']*)["']?\)/, '$1');
        const normalizedCurrentUrl = currentAppliedUrl.replace(/url\(["']?([^"']*)["']?\)/, '$1');

        if (normalizedNewUrl !== normalizedCurrentUrl) {
            currentGroundImageUrl = url;
            document.body.style.backgroundImage = `url(${currentGroundImageUrl})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundPosition = 'center';
            console.log(`[Whack-A-Mole]: Applied ground image: ${currentGroundImageUrl}`);
        } else {
            console.log(`[Whack-A-Mole]: Ground image already set to ${url}. Skipping re-application.`);
        }
    } else {
        // Revert to default ground image if an invalid URL is passed
        const defaultUrl = './css/background.jpg'; // Corrected default path to be relative to script.js
        const normalizedDefaultUrl = defaultUrl.replace(/url\(["']?([^"']*)["']?\)/, '$1');
        const normalizedCurrentUrl = currentAppliedUrl.replace(/url\(["']?([^"']*)["']?\)/, '$1');

        if (normalizedDefaultUrl !== normalizedCurrentUrl) {
            currentGroundImageUrl = defaultUrl;
            document.body.style.backgroundImage = `url(${currentGroundImageUrl})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundPosition = 'center';
            console.warn("[Whack-A-Mole]: Invalid ground image URL received. Reverting to default.");
        } else {
            console.log(`[Whack-A-Mole]: Invalid ground URL received, but default (${defaultUrl}) is already applied. Skipping re-application.`);
        }
    }
}
// --- MODIFIED window.addEventListener('message', ...) BLOCK ---
// This listens for messages from your React app and updates game parameter
window.addEventListener('message', function(event) {
    // IMPORTANT: For security in production, verify event.origin
    // if (event.origin !== 'http://localhost:3000' && event.origin !== 'https://your-gamegen-app.vercel.app') {
    //     return;
    // }

    const { type, key, value, assetType, url, data } = event.data; // Added 'data' for potential nested URLs

    console.log(`[Whack-A-Mole Game]: Received message - Type: ${type}, Key: ${key}, Value: ${value}, AssetType: ${assetType}, URL: ${url}`);

    // ONLY call asset application functions if the message type is 'UPDATE_ASSET'
    if (type === 'UPDATE_PARAM') {
        if (key === 'moleSpawnRate') {
            if (value >= 2000) {
                velocity_level = 0;
            } else if (value >= 1000) {
                velocity_level = 1;
            } else {
                velocity_level = 2;
            }
            console.log(`[Whack-A-Mole]: Set velocity_level to ${velocity_level} for mole spawn rate ${value}`);

        } else if (key === 'gameDuration') {
            if (value >= 90) {
                time_level = 0;
            } else if (value >= 45) {
                time_level = 1;
            } else {
                time_level = 2;
            }
            console.log(`[Whack-A-Mole]: Set time_level to ${time_level} for game duration ${value}`);

            if (started) {
                clearInterval(countdown);
                time = 0;
                timer.textContent = `${getTime()}`;
                countdown = setInterval(() => {
                    time++;
                    timer.textContent = `${getTime() - time}`;
                    (getTime() - time === 3 || getTime() - time === 1) ? timer.style.color = '#f33' : timer.style.color = 'inherit';

                    if (time >= getTime()) {
                        clearInterval(countdown);
                        timeUp = true;
                        started = false;
                        if (volume_level) {
                            ding_sfx.currentTime = 0;
                            ding_sfx.play();
                        }
                        setTimeout(() => {
                            scoreboardUpdater();
                        }, 1000);
                    }
                }, 1000);
            } else {
                timer.textContent = `${getTime()}`;
            }
        }
    } else if (type === 'UPDATE_ASSET') {
        let finalUrlToUse = url;
        // The React UI is sending 'data' with nested 'urls' or 'imageUrl'
        if (data && data.urls && data.urls.length > 0) {
            finalUrlToUse = data.urls[0];
        } else if (data && data.imageUrl) {
            finalUrlToUse = data.imageUrl;
        }

        // IMPORTANT: Override finalUrlToUse with the correct relative path if it's a default asset.
        // This forces the game to use its known correct path, regardless of what the UI sends for defaults.
        if (assetType === 'moleCharacter') {
            // If the incoming URL from React UI is for the default mole, use the game's internal default path
            if (finalUrlToUse && finalUrlToUse.includes('/assets/mole.png')) { // Check if it's the React UI's default absolute path
                finalUrlToUse = './css/mole.png'; // Force to game's correct relative path
            }
            applyMoleAsset(finalUrlToUse);
        } else if (assetType === 'ground') {
            // If the incoming URL from React UI is for the default ground, use the game's internal default path
            if (finalUrlToUse && finalUrlToUse.includes('/assets/ground.png')) { // Check if it's the React UI's default absolute path
                finalUrlToUse = './css/background.jpg'; // Force to game's correct relative path
            }
            applyGroundAsset(finalUrlToUse);
        }
        // Handle hammer asset type here if needed, otherwise it will be ignored
        // else if (assetType === 'hammer') {
        //     // Logic to apply hammer image if you have a DOM element for it
        //     // console.log(`[Whack-A-Mole]: Hammer asset received: ${finalUrlToUse}`);
        // }
    }
}, false);
