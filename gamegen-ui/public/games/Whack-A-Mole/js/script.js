// gamegen-ui/public/games/Whack-A-Mole/js/script.js

// --- NEW: EXPORTED GAME DATA INJECTION POINT ---
// These variables will be defined by the backend when the game is exported.
// They will override the default constants below if the game is run from an exported ZIP.
// If not exported (i.e., running directly in development or editor), these will be undefined,
// and the defaults will be used.
// The backend will prepend 'const EXPORTED_GAME_PARAMETERS = {...};' and
// 'const EXPORTED_CURRENT_ASSETS = {...};' here.
// --- END NEW INJECTION POINT ---

const start_sfx = new Audio('./css/start.mp3');
const hit_sfx = new Audio('./css/hit.mp3');
const hit2_sfx = new Audio('./css/hit2.mp3');
const peep_sfx = new Audio('./css/peep.mp3');
const ding_sfx = new Audio('./css/ding.mp3');
const pam_sfx = new Audio('./css/pam.mp3');
const pum_sfx = new Audio('./css/pum.mp3');
const holes = document.querySelectorAll('.hole');
const moles = document.querySelectorAll('.mole');

const counter = document.querySelector('.score span');
const start = document.querySelector('.start');
const timer = document.querySelector('.time span');

const bestScoreDOM = document.querySelector('.best-score span');

const velocityLevelDOM = document.querySelector('.velocity-level');
const timeLevelDOM = document.querySelector('.time-level');
const volumeLevelDOM = document.querySelector('.volume-level');


// --- MODIFIED: Global variables to store current generated image URLs ---
// Initialize directly from EXPORTED_CURRENT_ASSETS if present, otherwise use default paths.
let currentMoleImageUrl = (typeof EXPORTED_CURRENT_ASSETS !== 'undefined' && EXPORTED_CURRENT_ASSETS.moleCharacter) 
                          ? EXPORTED_CURRENT_ASSETS.moleCharacter 
                          : 'css/mole.png'; // Default mole image path
let currentGroundImageUrl = (typeof EXPORTED_CURRENT_ASSETS !== 'undefined' && EXPORTED_CURRENT_ASSETS.ground) 
                            ? EXPORTED_CURRENT_ASSETS.ground 
                            : 'css/background.png'; // Default ground image path


// MODIFIED: Use EXPORTED_GAME_PARAMETERS for initial values, else defaults.
// Map frontend parameters (moleSpawnRate, gameDuration) to internal levels (0, 1, 2).
let velocity_level = (typeof EXPORTED_GAME_PARAMETERS !== 'undefined' && EXPORTED_GAME_PARAMETERS.moleSpawnRate !== undefined) 
                     ? (EXPORTED_GAME_PARAMETERS.moleSpawnRate >= 2500 ? 0 : (EXPORTED_GAME_PARAMETERS.moleSpawnRate >= 1500 ? 1 : 2))
                     : 1; // Default to 1 (medium)
let time_level = (typeof EXPORTED_GAME_PARAMETERS !== 'undefined' && EXPORTED_GAME_PARAMETERS.gameDuration !== undefined) 
                 ? (EXPORTED_GAME_PARAMETERS.gameDuration >= 90 ? 0 : (EXPORTED_GAME_PARAMETERS.gameDuration >= 60 ? 1 : 2))
                 : 1; // Default to 1 (medium)

let volume_level = 1;
let count = 0;
let bestScore = 0;
let lastHole;
let time = 0;
let timeUp;
let started = false;

let countdown;
let gameRestartTimer;

const simpleGameOverDOM = document.getElementById('simple-game-over');
const simpleRetryButton = document.getElementById('simple-retry-button');
const gameContainer = document.querySelector('.container');

start.addEventListener('click', initGame);
holes.forEach(hole => hole.addEventListener('mousedown', up));
holes.forEach(hole => hole.addEventListener('touchstart', up));
velocityLevelDOM.addEventListener('click', changeVelocityLevel);
timeLevelDOM.addEventListener('click', changeTimeLevel);
volumeLevelDOM.addEventListener('click', changeVolumeLevel);

simpleRetryButton.addEventListener('click', () => {
    simpleGameOverDOM.style.display = 'none';
    gameContainer.style.display = 'block';
    resetGame();
});

// --- MODIFIED: Initial setup on page load ---
document.addEventListener('DOMContentLoaded', () => {
    bestScore = localStorage.getItem('whackAMoleBestScore') || 0;
    bestScoreDOM.textContent = bestScore;

    counter.textContent = '0';
    // Use the potentially updated time_level here
    timer.textContent = `${getTime()}`; 

    // Apply initial ground image
    applyGroundAsset(currentGroundImageUrl);

    // Apply initial mole image to all mole elements (for display before game starts)
    moles.forEach((mole, index) => {
        mole.style.backgroundImage = `url(${currentMoleImageUrl})`;
        mole.style.backgroundSize = 'contain';
        mole.style.backgroundRepeat = 'no-repeat';
        mole.style.backgroundPosition = 'center';
        mole.style.display = 'none'; // Ensure moles are hidden initially
        mole.style.opacity = '1';
        console.log(`[Mole Init Debug]: Mole ${index} initial image and display after DOMContentLoaded: ${mole.style.backgroundImage}, ${mole.style.display}`);
    });
    holes.forEach(hole => hole.classList.remove('up')); // Ensure holes are not 'up'

    console.log(`[Whack-A-Mole]: Document fully loaded. Initial velocity_level: ${velocity_level}, time_level: ${time_level}`);
});


// Functions
function up(e) {
    e.preventDefault();
    if (started && this.classList.contains('up')) {
        this.classList.remove('up');

        // Restore hole image opacity when mole goes down after being hit
        const holeImg = this.querySelector('img');
        if (holeImg) {
            holeImg.style.opacity = '1';
        }

        if (volume_level) {
            const x = Math.round(Math.random() * (2 - 1) + 1);
            if (x === 1) {
                hit_sfx.currentTime = 0;
                hit_sfx.play();
            } else {
                hit2_sfx.currentTime = 0.1;
                hit2_sfx.play();
            }
        }
        count++;
        counter.textContent = `${count}`;
    }
}

function peep() {
    const randomTime = getRandomTime();
    const hole = randomHole(holes);
    hole.classList.add('up'); // This adds the 'up' class to the hole

    // --- MODIFIED: Hide hole image when mole pops up, and set mole image ---
    const holeImg = hole.querySelector('img');
    if (holeImg) {
        holeImg.style.opacity = '0'; // Hide the hole image by making it transparent
    }

    const moleDiv = hole.querySelector('.mole');
    if (moleDiv) {
        // Ensure the correct currentMoleImageUrl is applied when mole pops up
        moleDiv.style.backgroundImage = `url(${currentMoleImageUrl})`;
        moleDiv.style.backgroundSize = 'contain';
        moleDiv.style.backgroundRepeat = 'no-repeat';
        moleDiv.style.backgroundPosition = 'center';

        moleDiv.style.display = 'block'; // Ensure mole is visible when it pops up
        moleDiv.style.opacity = '1'; // Ensure full opacity
    }

    if (volume_level) {
        peep_sfx.currentTime = 0;
        peep_sfx.play();
    }
    moleTimeout = setTimeout(() => {
        hole.classList.remove('up'); // This removes the 'up' class from the hole

        // --- MODIFIED: Show hole image when mole goes down ---
        if (holeImg) {
            holeImg.style.opacity = '1'; // Show the hole image again
        }

        if (moleDiv) {
            moleDiv.style.display = 'none'; // Hide mole after timeout
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

function initGame() {
    if (started === false) {
        if (volume_level) {
            start_sfx.currentTime = 0.125;
            start_sfx.play();
        }
        resetGame();
        started = true;
        startGameplayLoop();
    }
}

function startGameplayLoop() {
    peep();

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
}

function resetGame() {
    clearInterval(countdown);
    clearTimeout(gameRestartTimer);

    count = 0;
    counter.textContent = '0';

    time = 0;
    timeUp = false;
    started = false;

    timer.textContent = `${getTime()}`;

    holes.forEach(hole => hole.classList.remove('up'));
    moles.forEach(mole => {
        // Ensure correct mole image is applied on reset
        mole.style.backgroundImage = `url(${currentMoleImageUrl})`; 
        mole.style.backgroundSize = 'contain';
        mole.style.backgroundRepeat = 'no-repeat';
        mole.style.backgroundPosition = 'center';
        mole.style.display = 'none';
        mole.style.opacity = '1';
    });

    if (count > bestScore) {
        bestScore = count;
        localStorage.setItem('whackAMoleBestScore', bestScore);
        bestScoreDOM.textContent = bestScore;
    }
    bestScoreDOM.textContent = localStorage.getItem('whackAMoleBestScore') || 0;
}

function scoreboardUpdater() {
    gameContainer.style.display = 'none';
    simpleGameOverDOM.style.display = 'block';

    if (count > bestScore) {
        bestScore = count;
        localStorage.setItem('whackAMoleBestScore', bestScore);
        bestScoreDOM.textContent = bestScore;
    }
}

// MODIFIED: Use the velocity_level variable, not hardcoded cases (used in getRandomTime)
function getRandomTime() {
    // These mappings correspond to velocity_level 0, 1, 2
    const times = {
        0: [2500, 1500], // Easy (moleSpawnRate >= 2500)
        1: [1500, 700],  // Medium (moleSpawnRate >= 1500)
        2: [700, 300]    // Hard (moleSpawnRate < 700)
    };
    const [min, max] = times[velocity_level] || times[1]; // Default to medium if level is unexpected
    return Math.round(Math.random() * (max - min) + min);
}


// MODIFIED: Use the time_level variable, not hardcoded cases (used in getTime)
function getTime() {
    // These mappings correspond to time_level 0, 1, 2
    const durations = {
        0: 90, // Easy (gameDuration >= 90)
        1: 60, // Medium (gameDuration >= 45)
        2: 30  // Hard (gameDuration < 45)
    };
    return durations[time_level] || durations[1]; // Default to medium if level is unexpected
}


function changeVelocityLevel(e, n) {
    const element = velocityLevelDOM.children[1];
    const currentLevel = n || +element.textContent;
    if (volume_level) {
        start_sfx.currentTime = 0.125;
        start_sfx.play();
    }
    switch (currentLevel) {
        case 1:
            element.classList.remove('easy');
            element.classList.add('normal');
            element.textContent = '2';
            velocity_level = 1;
            break;
        case 2:
            element.classList.remove('normal');
            element.classList.add('hard');
            element.textContent = '3';
            velocity_level = 2;
            break;
        case 3: // This case handles wrap-around from Hard to Easy
            element.classList.remove('hard');
            element.classList.add('easy');
            element.textContent = '1';
            velocity_level = 0;
            break;
        default: // Fallback
            element.textContent = '2';
            velocity_level = 1;
            break;
    }
}
function changeTimeLevel(e, n) {
    const element = timeLevelDOM.children[1];
    const currentLevel = n || element.textContent; // Using textContent might be string, compare carefully
    if (volume_level) {
        start_sfx.currentTime = 0.125;
        start_sfx.play();
    }
    switch (currentLevel) {
        case '90': // Assuming '90' is textContent for easy
            element.classList.remove('easy');
            element.classList.add('normal');
            element.textContent = '60'; // Should map to medium duration
            time_level = 1;
            break;
        case '60': // Assuming '60' is textContent for normal
            element.classList.remove('normal');
            element.classList.add('hard');
            element.textContent = '30'; // Should map to hard duration
            time_level = 2;
            break;
        case '30': // Assuming '30' is textContent for hard
            element.classList.remove('hard');
            element.classList.add('easy');
            element.textContent = '90'; // Should map to easy duration
            time_level = 0;
            break;
        default: // Fallback
            element.textContent = '60';
            time_level = 1;
            break;
    }
}
function changeVolumeLevel() {
    const element = volumeLevelDOM.children[1];
    const currentLevel = element.textContent;
    switch (currentLevel) {
        case 'X':
            element.textContent = '';
            volume_level = 1;
            break;
        default:
            element.textContent = 'X';
            volume_level = 0;
            break;
    }
    if (volume_level) {
        start_sfx.currentTime = 0.125;
        start_sfx.play();
    }
}

// --- MODIFIED HELPER FUNCTIONS FOR ASSET APPLICATION ---
// These functions are now used internally by the game AND by the message listener.
function applyMoleAsset(url) {
    console.log(`[Mole Apply Debug]: URL received by applyMoleAsset: ${url.substring(0, 50)}... (Length: ${url.length})`);
    
    // Only update if the URL is different to prevent unnecessary DOM manipulation
    // Note: Comparing full Base64 URLs can be slow, but for hackathon, usually fine.
    const currentAppliedUrl = moles.length > 0 ? moles[0].style.backgroundImage.replace(/url\(["']?([^"']*)["']?\)/, '$1') : '';
    const normalizedNewUrl = url.replace(/url\(["']?([^"']*)["']?\)/, '$1'); // Normalize incoming URL for comparison

    if (normalizedNewUrl !== currentAppliedUrl) {
        currentMoleImageUrl = url; // Update the global variable to the new URL (Base64 or path)
        moles.forEach(mole => {
            mole.style.backgroundImage = `url(${currentMoleImageUrl})`;
            mole.style.backgroundSize = 'contain';
            mole.style.backgroundRepeat = 'no-repeat';
            mole.style.backgroundPosition = 'center';
            // Also ensure the mole is visible (its <div>, not the img inside the hole)
            mole.style.display = 'block'; 
            mole.style.opacity = '1';
        });
        console.log(`[Whack-A-Mole]: Applied mole character image: ${currentMoleImageUrl.substring(0, 50)}...`);
    } else {
        console.log(`[Whack-A-Mole]: Mole image already set to ${url.substring(0, 50)}.... Skipping re-application.`);
    }
}

function applyGroundAsset(url) {
    console.log(`[Ground Apply Debug]: URL received by applyGroundAsset: ${url.substring(0, 50)}... (Length: ${url.length})`);
    const currentAppliedUrl = document.body.style.backgroundImage.replace(/url\(["']?([^"']*)["']?\)/, '$1');
    const normalizedNewUrl = url.replace(/url\(["']?([^"']*)["']?\)/, '$1');

    if (normalizedNewUrl !== currentAppliedUrl) {
        currentGroundImageUrl = url;
        document.body.style.backgroundImage = `url(${currentGroundImageUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundPosition = 'center';
        console.log(`[Whack-A-Mole]: Applied ground image: ${currentGroundImageUrl.substring(0, 50)}...`);
    } else {
        console.log(`[Whack-A-Mole]: Ground image already set to ${url.substring(0, 50)}.... Skipping re-application.`);
    }
}

// --- MODIFIED window.addEventListener('message', ...) BLOCK ---
// This listener handles updates from the React editor for live preview.
window.addEventListener('message', function(event) {
    // IMPORTANT: For security in production, verify event.origin
    const { type, key, value, assetType, url, data } = event.data;
    
    // Debug log for incoming messages
    console.log(`[Whack-A-Mole Game]: Received message - Type: ${type}, Key: ${key}, Value: ${value}, AssetType: ${assetType}, URL: ${url ? url.substring(0, 50) + '...' : 'undefined'}`);

    if (type === 'UPDATE_PARAM') {
        if (key === 'moleSpawnRate') {
            // Logic to map the exact moleSpawnRate value to velocity_level (0, 1, 2)
            if (value >= 2500) { velocity_level = 0; } // Slower, easy
            else if (value >= 1500) { velocity_level = 1; } // Medium
            else { velocity_level = 2; } // Faster, hard
            console.log(`[Whack-A-Mole]: Set velocity_level to ${velocity_level} for mole spawn rate ${value}`);
        } else if (key === 'gameDuration') {
            // Logic to map the exact gameDuration value to time_level (0, 1, 2)
            if (value >= 90) { time_level = 0; } // Longer duration, easy
            else if (value >= 60) { time_level = 1; } // Medium
            else { time_level = 2; } // Shorter duration, hard
            console.log(`[Whack-A-Mole]: Set time_level to ${time_level} for game duration ${value}`);

            // If game is already started, reset and restart countdown with new duration
            if (started) {
                clearInterval(countdown);
                time = 0; // Reset current time
                timer.textContent = `${getTime()}`; // Update displayed time
                startGameplayLoop(); // Restart the countdown and peeping
            } else {
                timer.textContent = `${getTime()}`; // Just update display if game not started
            }
        }
    } else if (type === 'UPDATE_ASSET') {
        let finalUrlToUse = url;
        // React UI might send 'data' with nested 'urls' or 'imageUrl' for complex assets (e.g., animations).
        // For simple image URLs (including Base64), 'url' is preferred.
        if (!finalUrlToUse && data && data.urls && data.urls.length > 0) {
            finalUrlToUse = data.urls[0]; // Take first URL from array for single asset
        } else if (!finalUrlToUse && data && data.imageUrl) {
            finalUrlToUse = data.imageUrl;
        }
        
        // Ensure the full Base64 URL is passed if it exists
        if (finalUrlToUse && finalUrlToUse.startsWith('data:image/')) {
            // This is a Base64 URL, pass it directly
        } else if (finalUrlToUse && !finalUrlToUse.startsWith('http')) {
            // If it's a relative path, ensure it's correctly relative to index.html
            // For Whack-A-Mole, assets are typically relative to the game's root or 'css/' folder.
            // Backend outputs to 'exported_assets/' or 'css/' so we need to make sure the relative path is correct.
            // Given the backend places them, the path from `getZipAssetPath` is what is relevant.
            // Example: `exported_assets/mole_char_123.png`
        }

        if (assetType === 'moleCharacter') {
            applyMoleAsset(finalUrlToUse);
        } else if (assetType === 'ground') {
            applyGroundAsset(finalUrlToUse);
        }
        // Handle hammer asset type here if needed.
    }
}, false); // 'false' is default, can be omitted.


// Event Listeners (UNCHANGED)
holes.forEach(hole => hole.addEventListener('mousedown', whack));
holes.forEach(hole => hole.addEventListener('touchstart', up));
startButton.addEventListener('click', initGame);

// Initialize high scores display on load
displayHighScores();