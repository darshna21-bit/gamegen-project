// script.js from simple match 3
// Global variables - use `let` for configurability
let candies = ["./images/Blue.png", "./images/Orange.png", "./images/Green.png", "./images/Yellow.png", "./images/Red.png", "./images/Purple.png"]; // Default initial candies (paths)
let board = [];
let rows = 9; // Keep as is, your default logic manages this
let columns = 9; // Keep as is, your default logic manages this
let score = 0;
let gameInterval; // To control the main game loop
// let gameSpeedMs = 100; // Speed of crush/slide/generate loop - REMOVED as per plan
let scorePerMatch = 30; // Points awarded for each 3-match
let gameDuration = 60; // Initial game duration in seconds
let timeLeft = gameDuration; // Current time remaining
let timerInterval; // To control the countdown timer loop

var currTile;
var otherTile;

// Get elements from the HTML (make sure your index.html has these IDs)
let scoreDisplay;
let timerDisplay;
let boardElement;
let gameOverMessage; // To show "Game Over"

window.onload = function() {
    scoreDisplay = document.getElementById("score");
    timerDisplay = document.getElementById("timer");
    boardElement = document.getElementById("board");
    gameOverMessage = document.getElementById("game-over-message");

    console.log("[script.js] window.onload fired. Initializing game.");
    console.log("[script.js] Initial boardElement reference:", boardElement); // Check if element is found

    startGame();
    setGameInterval(); // Start the main game loop
    startTimer();      // Start the countdown timer

    // --- Listen for messages from the parent React app ---
    window.addEventListener('message', function(event) {
        // For security, always verify the origin in a real application (e.g., event.origin === "http://localhost:3000")

        // Destructure directly the properties that GameEditor.js is sending:
        // type, key, value for UPDATE_PARAM
        // type, assetType, data, url for UPDATE_ASSET (Note: 'url' here is from GameEditor's payloadForGame logic)
        const { type, key, value, assetType, data, url } = event.data;

        // Log the received data for debugging
        console.log(`%c[script.js]: Received message - Type: ${type}, Key: ${key}, Value: ${value}, AssetType: ${assetType}, Data:`, 'color: lightblue;', data, `URL: ${url}`);

        if (type === 'UPDATE_PARAM') {
            let boardDimensionsChanged = false;

            console.log(`%c[script.js] UPDATE_PARAM received. Key: ${key}, Value: ${value}`, 'color: yellow;');

            switch (key) {
                case 'rows':
                    console.log(`%c[script.js] Updating rows: ${rows} -> ${value}`, 'color: lightgreen;');
                    if (rows !== value) { rows = value; boardDimensionsChanged = true; }
                    break;
                case 'columns':
                    console.log(`%c[script.js] Updating columns: ${columns} -> ${value}`, 'color: lightgreen;');
                    if (columns !== value) { columns = value; boardDimensionsChanged = true; }
                    break;
                case 'scorePerMatch':
                    console.log(`%c[script.js] Updating scorePerMatch: ${scorePerMatch} -> ${value}`, 'color: lightgreen;');
                    scorePerMatch = value;
                    break;
                case 'gameDuration':
                    console.log(`%c[script.js] Updating gameDuration: ${gameDuration} -> ${value}`, 'color: lightgreen;');
                    if (gameDuration !== value) {
                        gameDuration = value;
                        resetGame();
                    }
                    break;
                default:
                    console.warn(`%c[script.js]: Unknown setting key received: ${key}`, 'color: orange;');
            }
            
            if (boardDimensionsChanged) {
                // Your existing logic handles the board resizing based on these new values
                console.log(`%c[script.js] Board dimensions changed. Calling resetGame(). Current rows: ${rows}, columns: ${columns}`, 'color: yellow;');
                resetGame();
            } else {
                console.log("%c[script.js] Board dimensions NOT changed. No resetGame() call for dimensions.", 'color: gray;');
            }
        } else if (type === 'UPDATE_ASSET') {
            console.log(`%c[script.js] UPDATE_ASSET received. Asset Type: ${assetType}, Data:`, 'color: lightblue;', data);

            // --- MODIFICATION 1: Handle background and gemSet updates ---
            if (assetType === 'background') {
                const bgUrl = url || (data && data.imageUrl); // Prioritize direct 'url' if available, otherwise check 'data.imageUrl'
                if (bgUrl && typeof bgUrl === 'string' && bgUrl.startsWith('data:image/')) {
                    console.log(`%c[script.js] Updating background to: ${bgUrl}`, 'color: lightgreen;');
                    // Apply to body style using your original CSS properties
                    document.body.style.backgroundImage = `url("${bgUrl}")`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center center'; // Changed from 'center' to 'center center' to match typical usage in your CSS
                    document.body.style.backgroundRepeat = 'no-repeat';
                    document.body.style.backgroundAttachment = 'fixed'; // Added to match your CSS
                } else {
                    console.warn(`%c[script.js]: Invalid or missing background URL received: ${bgUrl}`, 'color: orange;', data);
                }
            } else if (assetType === 'gemSet') {
                // gemSet is expected to be an object with a 'urls' array
                if (data && data.urls && Array.isArray(data.urls) && data.urls.length > 0) {
                    console.log(`%c[script.js] Updating gemSet assets with URLs:`, 'color: lightgreen;', data.urls);
                    updateCandyAssets(data); // `data` here contains `urls` array and `isAnimated`
                } else {
                    console.warn(`%c[script.js]: Invalid or empty gemSet data received for UPDATE_ASSET:`, 'color: orange;', data);
                }
            } else {
                console.warn(`%c[script.js]: Received asset update for unrecognized type or with invalid data: ${assetType}`, 'color: orange;', data);
            }
        } else {
            console.warn(`%c[script.js]: Received unknown message type: ${type}`, 'color: orange;', event.data);
        }
    });
}

function setGameInterval() {
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    gameInterval = window.setInterval(function(){
        if (timeLeft > 0) {
            crushCandy();
            slideCandy();
            generateCandy();
        }
    }, 150);
}

function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timeLeft = gameDuration;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            clearInterval(gameInterval);
            gameOver();
        }
    }, 1000);
}

function updateTimerDisplay() {
    if (timerDisplay) {
        timerDisplay.innerText = timeLeft;
    }
}

function gameOver() {
    if (gameOverMessage) {
        gameOverMessage.style.display = 'block';
        gameOverMessage.innerText = `Game Over! Your Score: ${score}`;
    }
    if (boardElement) {
        boardElement.style.pointerEvents = 'none';
    }
    console.log("%c[script.js] Game Over! Final Score:", 'color: red;', score);
}

function resetGame() {
    console.log("%c[script.js] resetGame() called. Clearing board and restarting.", 'color: yellow;');
    if (boardElement) {
        boardElement.innerHTML = "";
        board = [];
        console.log("%c[script.js] boardElement cleared, board array reset.", 'color: gray;');
    }
    score = 0;
    if (scoreDisplay) {
        scoreDisplay.innerText = score;
    }
    if (gameOverMessage) {
        gameOverMessage.style.display = 'none';
    }
    if (boardElement) {
        boardElement.style.pointerEvents = 'auto';
    }

    startGame();
    setGameInterval();
    startTimer();
    console.log("%c[script.js] resetGame() finished. New game started.", 'color: yellow;');
}

const getFrameFilename = (prefix, frameIndex) => {
    // This function is generally for animated sprites.
    // For match-3, we typically get distinct static images, so this is unlikely to be used
    // unless you integrate animated candies in the future.
    if (prefix.includes('skeleton-animation_')) {
        return `${prefix}${String(frameIndex).padStart(2, '0')}.png`;
    }
    if (prefix.includes('eagle')) {
        return `${prefix}${String(frameIndex).padStart(3, '0')}.png`;
    }
    if (prefix.includes('man')) {
        return `${prefix}${String(frameIndex).padStart(3, '0')}.png`;
    }
    if (prefix.includes('frame-')) {
        return `${prefix}${frameIndex + 1}.png`;
    }
    return `${prefix}${frameIndex}.png`;
};

function updateCandyAssets(gemSetData) {
    const newCandies = [];
    console.log("%c[script.js] updateCandyAssets called with:", 'color: magenta;', gemSetData);

    // Prefer `urls` array if available, as a match-3 game needs multiple distinct items.
    if (gemSetData.urls && Array.isArray(gemSetData.urls) && gemSetData.urls.length > 0) {
        // Ensure that each URL from the AI is used as a distinct candy type.
        newCandies.push(...gemSetData.urls); 
        console.log("%c[script.js] Updated candies from gemSetData.urls (static collection):", 'color: magenta;', newCandies);
    }
    // Fallback for animated assets (unlikely for Match-3 "candies")
    else if (gemSetData.isAnimated && gemSetData.prefix && gemSetData.count > 0) {
        for (let i = 0; i < gemSetData.count; i++) {
            newCandies.push(getFrameFilename(gemSetData.prefix, i));
        }
        console.log("%c[script.js] Updated candies from animationData (animated - unlikely for match3):", 'color: magenta;', newCandies);
    }
    // Fallback if AI somehow sends a single imageUrl directly for gemSet (not an array)
    else if (gemSetData.imageUrl && typeof gemSetData.imageUrl === 'string' && gemSetData.imageUrl.length > 0) {
        console.warn("%c[script.js] Received single image URL for gemSet. Match-3 typically requires multiple distinct candy images. Using it as the only type for now.", 'color: orange;');
        newCandies.push(gemSetData.imageUrl);
    }
    // Case: Invalid or empty data - revert to default
    else {
        console.warn("%c[script.js]: Invalid or empty gemSet data received. Reverting to default candies.", 'color: orange;', gemSetData);
        candies = ["./images/Blue.png", "./images/Orange.png", "./images/Green.png", "./images/Yellow.png", "./images/Red.png", "./images/Purple.png"];
        resetGame(); // Ensure board is refreshed with default if asset update failed
        return; // Exit early as we've already handled the default
    }

    // Only update global candies array if newCandies has elements
    if (newCandies.length > 0) {
        candies = newCandies; // Update the global candies array
        console.log("%c[script.js] Global candies array updated to:", 'color: lightgreen;', candies);
        resetGame(); // Re-initialize the board with new candy assets
    } else {
        console.warn("%c[script.js]: No valid candy assets generated. Keeping current candies.", 'color: orange;');
    }
}


function randomCandy() {
    console.log("%c[script.js] randomCandy() called. Current 'candies' array:", 'color: cyan;', candies);
    // The 'candies' array now directly contains the full paths (either default or Base64 URLs)
    const selectedCandySrc = candies[Math.floor(Math.random() * candies.length)];
    console.log(`%c[script.js] randomCandy() selected: "${selectedCandySrc}"`, 'color: cyan;');
    return selectedCandySrc;
}

function startGame() {
    console.log(`%c[script.js] startGame() called. Building board with rows: ${rows}, columns: ${columns}`, 'color: yellow;');
    console.log("%c[script.js] boardElement at startGame start:", 'color: gray;', boardElement);

    if (!boardElement) {
        console.error("%c[script.js] ERROR: boardElement is null or undefined in startGame()!", 'color: red;');
        return;
    }

    boardElement.innerHTML = '';
    board = [];
    
    // --- NO CHANGES HERE: Retain your original grid setup logic ---
    // Your game already handles dynamic rows/columns and individual tile sizing correctly.
    boardElement.style.display = 'grid';
    boardElement.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    console.log("%c[script.js] boardElement.style.cssText AFTER setting grid styles:", 'color: orange;', boardElement.style.cssText);


    for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < columns; c++) {
            let tile = document.createElement("img");
            tile.id = r.toString() + "-" + c.toString();
            tile.src = randomCandy(); // Assign random candy image

            // Add event listeners for drag and drop functionality
            tile.addEventListener("dragstart", dragStart);
            tile.addEventListener("dragover", dragOver);
            tile.addEventListener("dragenter", dragEnter);
            tile.addEventListener("dragleave", dragLeave);
            tile.addEventListener("drop", dragDrop);
            tile.addEventListener("dragend", dragEnd);

            // --- NO CHANGES HERE: Retain your original objectFit setting ---
            tile.style.objectFit = 'contain'; // Ensure images fit within their cells

            boardElement.append(tile); // Add tile to the board
            row.push(tile); // Add tile to the current row array
        }
        board.push(row); // Add row to the main board array
    }

    fillBoardUntilNoMatches();
}

function fillBoardUntilNoMatches() {
    let hasMatches = true;
    let attempts = 0;
    while (hasMatches && attempts < 100) {
        hasMatches = false;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < columns; c++) {
                let newCandySrc;
                do {
                    newCandySrc = randomCandy();
                    board[r][c].src = newCandySrc;
                } while (isMatchAt(r, c));
            }
        }
        if (checkValid()) { // This ensures the *initial* board has no matches.
            hasMatches = true;
        }
        attempts++;
        if (attempts >= 100) { // Safety break
             console.warn("%c[script.js] fillBoardUntilNoMatches: Exceeded max attempts to create a board without initial matches. Board might start with some matches.", 'color: orange;');
        }
    }
}


function isMatchAt(r, c) {
    const currentSrc = board[r][c].src;
    if (c >= 2 && board[r][c-1].src === currentSrc && board[r][c-2].src === currentSrc) return true;
    if (c >= 1 && c < columns - 1 && board[r][c-1].src === currentSrc && board[r][c+1].src === currentSrc) return true;
    if (c < columns - 2 && board[r][c+1].src === currentSrc && board[r][c+2].src === currentSrc) return true;
    if (r >= 2 && board[r-1][c].src === currentSrc && board[r-2][c].src === currentSrc) return true;
    if (r >= 1 && r < rows - 1 && board[r-1][c].src === currentSrc && board[r+1][c].src === currentSrc) return true;
    if (r < rows - 2 && board[r+1][c].src === currentSrc && board[r+2][c].src === currentSrc) return true;
    return false;
}

function dragStart() {
    currTile = this;
}

function dragOver(e) {
    e.preventDefault();
}

function dragEnter(e) {
    e.preventDefault();
}

function dragLeave() {
}

function dragDrop() {
    otherTile = this;
}

function dragEnd() {
    if (!currTile || !otherTile) {
        console.warn("%c[script.js] Drag operation ended without valid tiles.", 'color: orange;');
        return;
    }
    if (currTile.src.includes("blank") || otherTile.src.includes("blank")) {
        return;
    }

    let currCoords = currTile.id.split("-");
    let r = parseInt(currCoords[0]);
    let c = parseInt(currCoords[1]);

    let otherCoords = otherTile.id.split("-");
    let r2 = parseInt(otherCoords[0]);
    let c2 = parseInt(otherCoords[1]);

    let moveLeft = c2 === c - 1 && r === r2;
    let moveRight = c2 === c + 1 && r === r2;
    let moveUp = r2 === r - 1 && c === c2;
    let moveDown = r2 === r + 1 && c === c2;

    let isAdjacent = moveLeft || moveRight || moveUp || moveDown;

    if (isAdjacent) {
        let currImg = currTile.src;
        let otherImg = otherTile.src;
        currTile.src = otherImg;
        otherTile.src = currImg;

        let validMove = checkValid();
        if (!validMove) {
            currTile.src = currImg;
            otherTile.src = otherImg;
        }
    }
    currTile = null;
    otherTile = null;
}

function crushCandy() {
    let matchesFoundThisCrush = false;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns - 2; c++) {
            let candy1 = board[r][c];
            let candy2 = board[r][c + 1];
            let candy3 = board[r][c + 2];
            if (!candy1.src.includes("blank") && candy1.src === candy2.src && candy2.src === candy3.src) {
                candy1.src = "./images/blank.png";
                candy2.src = "./images/blank.png";
                candy3.src = "./images/blank.png";
                score += scorePerMatch;
                matchesFoundThisCrush = true;
            }
        }
    }

    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows - 2; r++) {
            let candy1 = board[r][c];
            let candy2 = board[r + 1][c];
            let candy3 = board[r + 2][c];
            if (!candy1.src.includes("blank") && candy1.src === candy2.src && candy2.src === candy3.src) {
                candy1.src = "./images/blank.png";
                candy2.src = "./images/blank.png";
                candy3.src = "./images/blank.png";
                score += scorePerMatch;
                matchesFoundThisCrush = true;
            }
        }
    }

    if (scoreDisplay) {
        scoreDisplay.innerText = score;
    }
    return matchesFoundThisCrush;
}

function checkValid() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns - 2; c++) {
            let candy1 = board[r][c];
            let candy2 = board[r][c + 1];
            let candy3 = board[r][c + 2];
            if (candy1.src === candy2.src && candy2.src === candy3.src && !candy1.src.includes("blank")) {
                return true;
            }
        }
    }

    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows - 2; r++) {
            let candy1 = board[r][c];
            let candy2 = board[r + 1][c];
            let candy3 = board[r + 2][c];
            if (candy1.src === candy2.src && candy2.src === candy3.src && !candy1.src.includes("blank")) {
                return true;
            }
        }
    }
    return false;
}

function slideCandy() {
    for (let c = 0; c < columns; c++) {
        let ind = rows - 1;
        for (let r = rows - 1; r >= 0; r--) {
            if (!board[r][c].src.includes("blank")) {
                board[ind][c].src = board[r][c].src;
                if (r !== ind) {
                    board[r][c].src = "./images/blank.png";
                }
                ind -= 1;
            }
        }
        for (let r = ind; r >= 0; r--) {
            board[r][c].src = "./images/blank.png";
        }
    }
}

function generateCandy() {
    for (let c = 0; c < columns; c++) {
        if (board[0][c].src.includes("blank")) {
            board[0][c].src = randomCandy();
        }
    }
}