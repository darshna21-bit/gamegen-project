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
// Set to null initially, as these will be updated by the UPDATE_ASSET messages from the parent.
let currentMoleImageUrl = null;
let currentGroundImageUrl = null;

let velocity_level = 1;
let time_level = 1;
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
    timer.textContent = `${getTime()}`;

    // Ensure moles are hidden initially and holes are not 'up'
    moles.forEach((mole, index) => { // Added index for debug log
        mole.style.display = 'none';
        console.log(`[Mole Init Debug]: Mole ${index} initial display after DOMContentLoaded: ${mole.style.display}`);
    });
    holes.forEach(hole => hole.classList.remove('up'));

    console.log(`[Whack-A-Mole]: Document fully loaded. Waiting for messages from parent.`);
});


// Functions
function up(e) {
    e.preventDefault();
    if (started && this.classList.contains('up')) {
        this.classList.remove('up');

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

    // --- NEW JS LOGIC TO HIDE HOLE IMG WHEN MOLE POPS UP ---
    const holeImg = hole.querySelector('img');
    if (holeImg) {
        holeImg.style.opacity = '0'; // Hide the hole image by making it transparent
    }
    // --- END NEW JS LOGIC ---

    const moleDiv = hole.querySelector('.mole');
    if (moleDiv) {
        if (currentMoleImageUrl) {
            moleDiv.style.backgroundImage = `url(${currentMoleImageUrl})`;
            moleDiv.style.backgroundSize = 'contain';
            moleDiv.style.backgroundRepeat = 'no-repeat';
            moleDiv.style.backgroundPosition = 'center';
        }
        // --- ADDED DEBUG LOGS ---
        console.log(`[Mole Display Debug]: Before setting display for moleDiv: ${moleDiv.style.display}`);
        moleDiv.style.display = 'block'; // Ensure mole is visible when it pops up
        console.log(`[Mole Display Debug]: After setting display for moleDiv: ${moleDiv.style.display}`);
        // --- END DEBUG LOGS ---

        moleDiv.style.opacity = '1'; // Ensure full opacity
    }

    if (volume_level) {
        peep_sfx.currentTime = 0;
        peep_sfx.play();
    }
    setTimeout(() => {
        hole.classList.remove('up'); // This removes the 'up' class from the hole

        // --- NEW JS LOGIC TO SHOW HOLE IMG WHEN MOLE GOES DOWN ---
        if (holeImg) {
            holeImg.style.opacity = '1'; // Show the hole image again
        }
        // --- END NEW JS LOGIC ---

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
        if (currentMoleImageUrl) {
            mole.style.backgroundImage = `url(${currentMoleImageUrl})`;
        }
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

function getRandomTime() {
    switch (velocity_level) {
        case 0:
            return Math.round(Math.random() * (2500 - 1500) + 1500);
        case 1:
            return Math.round(Math.random() * (1500 - 700) + 700);
        case 2:
            return Math.round(Math.random() * (700 - 300) + 300);
        default:
            return Math.round(Math.random() * (1500 - 700) + 700);
    }
}

function getTime() {
    switch (time_level) {
        case 0:
            return 90;
        case 1:
            return 60;
        case 2:
            return 30;
        default:
            return 60;
    }
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
        case 3:
            element.classList.remove('hard');
            element.classList.add('easy');
            element.textContent = '1';
            velocity_level = 0;
            break;
        default:
            element.textContent = '2';
            velocity_level = 1;
            break;
    }
}
function changeTimeLevel(e, n) {
    const element = timeLevelDOM.children[1];
    const currentLevel = n || element.textContent;
    if (volume_level) {
        start_sfx.currentTime = 0.125;
        start_sfx.play();
    }
    switch (currentLevel) {
        case '30':
            element.classList.remove('easy');
            element.classList.add('normal');
            element.textContent = '10';
            time_level = 1;
            break;
        case '10':
            element.classList.remove('normal');
            element.classList.add('hard');
            element.textContent = '5';
            time_level = 2;
            break;
        case '5':
            element.classList.remove('hard');
            element.classList.add('easy');
            element.textContent = '30';
            time_level = 0;
            break;
        default:
            element.textContent = '10';
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
function applyMoleAsset(url) {
    // --- ADD THIS DEBUG LOG ---
    console.log(`[Mole Apply Debug]: URL received by applyMoleAsset: ${url.substring(0, 200)}... (Length: ${url.length})`);
    // --- END DEBUG LOG ---
    const currentAppliedUrl = moles.length > 0 ? moles[0].style.backgroundImage : '';

    if (url && typeof url === 'string' && url.trim() !== '') {
        const normalizedNewUrl = url.replace(/url\(["']?([^"']*)["']?\)/, '$1');
        const normalizedCurrentUrl = currentAppliedUrl.replace(/url\(["']?([^"']*)["']?\)/, '$1');

        if (normalizedNewUrl !== normalizedCurrentUrl) {
            currentMoleImageUrl = url; // Update the global variable to the new URL (Base64 or path)
            moles.forEach(mole => {
                mole.style.backgroundImage = `url(${currentMoleImageUrl})`;
                mole.style.backgroundSize = 'contain';
                mole.style.backgroundRepeat = 'no-repeat';
                mole.style.backgroundPosition = 'center';
            });
            console.log(`[Whack-A-Mole]: Applied mole character image: ${currentMoleImageUrl.substring(0, 50)}...`); // Log truncated Base64
        } else {
            console.log(`[Whack-A-Mole]: Mole image already set to ${url.substring(0, 50)}.... Skipping re-application.`);
        }
    } else {
        // Fallback to the game's original default path if no valid URL is provided.
        const defaultUrl = '../assets/mole.png'; // Path relative to index.html (from games/Whack-A-Mole/)
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
            console.warn("[Whack-A-Mole]: Invalid mole image URL received. Reverting to internal default.");
        } else {
            console.log(`[Whack-A-Mole]: Invalid mole URL received, but internal default (${defaultUrl}) is already applied. Skipping re-application.`);
        }
    }
}

function applyGroundAsset(url) {
     // --- ADD THIS DEBUG LOG ---
    console.log(`[Ground Apply Debug]: URL received by applyGroundAsset: ${url.substring(0, 200)}... (Length: ${url.length})`);
    // --- END DEBUG LOG ---
    const currentAppliedUrl = document.body.style.backgroundImage;

    if (url && typeof url === 'string' && url.trim() !== '') {
        const normalizedNewUrl = url.replace(/url\(["']?([^"']*)["']?\)/, '$1');
        const normalizedCurrentUrl = currentAppliedUrl.replace(/url\(["']?([^"']*)["']?\)/, '$1');

        if (normalizedNewUrl !== normalizedCurrentUrl) {
            currentGroundImageUrl = url;
            document.body.style.backgroundImage = `url(${currentGroundImageUrl})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundPosition = 'center';
            console.log(`[Whack-A-Mole]: Applied ground image: ${currentGroundImageUrl.substring(0, 50)}...`);
        } else {
            console.log(`[Whack-A-Mole]: Ground image already set to ${url.substring(0, 50)}.... Skipping re-application.`);
        }
    } else {
        const defaultUrl = '../assets/ground.png'; // Path relative to index.html (from games/Whack-A-Mole/)
        const normalizedDefaultUrl = defaultUrl.replace(/url\(["']?([^"']*)["']?\)/, '$1');
        const normalizedCurrentUrl = currentAppliedUrl.replace(/url\(["']?([^"']*)["']?\)/, '$1');

        if (normalizedDefaultUrl !== normalizedCurrentUrl) {
            currentGroundImageUrl = defaultUrl;
            document.body.style.backgroundImage = `url(${currentGroundImageUrl})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundPosition = 'center';
            console.warn("[Whack-A-Mole]: Invalid ground image URL received. Reverting to internal default.");
        } else {
            console.log(`[Whack-A-Mole]: Invalid ground URL received, but internal default (${defaultUrl}) is already applied. Skipping re-application.`);
        }
    }
}

// --- MODIFIED window.addEventListener('message', ...) BLOCK ---
window.addEventListener('message', function(event) {
    // IMPORTANT: For security in production, verify event.origin
    // if (event.origin !== 'http://localhost:3000' && event.origin !== 'https://your-gamegen-app.vercel.app') {
    //     return;
    // }

    const { type, key, value, assetType, url, data } = event.data;

    
    // --- MODIFY THIS DEBUG LOG TO SHOW MORE OF THE URL ---
    console.log(`[Whack-A-Mole Game]: Received message - Type: ${type}, Key: ${key}, Value: ${value}, AssetType: ${assetType}, URL: ${url ? url.substring(0, 200) + '...' : 'undefined'}`);
    // --- END MODIFY ---

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
        // The React UI might send 'data' with nested 'urls' or 'imageUrl' for complex assets (e.g., animations).
        // For simple image URLs (including Base64), 'url' is preferred.
        if (!finalUrlToUse && data && data.urls && data.urls.length > 0) {
            finalUrlToUse = data.urls[0];
        } else if (!finalUrlToUse && data && data.imageUrl) {
            finalUrlToUse = data.imageUrl;
        }
        // --- ADD THIS DEBUG LOG ---
        console.log(`[Whack-A-Mole Game Debug]: finalUrlToUse before apply: ${finalUrlToUse.substring(0, 200)}... (Length: ${finalUrlToUse.length})`);
        // --- END DEBUG LOG ---

        if (assetType === 'moleCharacter') {
            applyMoleAsset(finalUrlToUse);
        } else if (assetType === 'ground') {
            applyGroundAsset(finalUrlToUse);
        }
        // Handle hammer asset type here if needed.
    }
}, false);