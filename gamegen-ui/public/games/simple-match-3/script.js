// script.js from simple match 3
// Global variables - use `let` for configurability
let candies = ["Blue", "Orange", "Green", "Yellow", "Red", "Purple"]; // Default initial candies (colors)
let board = [];
let rows = 9;
let columns = 9;
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
                console.log(`%c[script.js] Board dimensions changed. Calling resetGame(). Current rows: ${rows}, columns: ${columns}`, 'color: yellow;');
                resetGame();
            } else {
                console.log("%c[script.js] Board dimensions NOT changed. No resetGame() call for dimensions.", 'color: gray;');
            }
        } else if (type === 'UPDATE_ASSET') {
            console.log(`%c[script.js] UPDATE_ASSET received. Asset Type: ${assetType}, Data:`, 'color: lightblue;', data);

            // *** FIX STARTS HERE ***
            // Change data.url to data.imageUrl for background assets
            if (assetType === 'background' && data && data.imageUrl) {
                console.log(`%c[script.js] Updating background to: ${data.imageUrl}`, 'color: lightgreen;');
                document.body.style.backgroundImage = `url("${data.imageUrl}")`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundRepeat = 'no-repeat';
            }
            // *** FIX ENDS HERE ***
            else if (assetType === 'gemSet' && data) {
                console.log(`%c[script.js] Updating gemSet assets with data:`, 'color: lightgreen;', data);
                updateCandyAssets(data); // `data` here contains `urls` array and `isAnimated`
            } else {
                console.warn(`%c[script.js]: Invalid assetType or data for UPDATE_ASSET: ${assetType}`, 'color: orange;', data);
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

    // Case 1: Animated asset (e.g., Flappy Bird character, though not typical for Match-3 candies)
    if (gemSetData.isAnimated && gemSetData.prefix && gemSetData.count > 0) {
        for (let i = 0; i < gemSetData.count; i++) {
            newCandies.push(getFrameFilename(gemSetData.prefix, i));
        }
        console.log("%c[script.js] Updated candies from animationData (animated):", 'color: magenta;', newCandies);
    }
    // Case 2: Collection of static images (your custom candies)
    else if (gemSetData.urls && Array.isArray(gemSetData.urls) && gemSetData.urls.length > 0) {
        newCandies.push(...gemSetData.urls); // Add all URLs from the array
        console.log("%c[script.js] Updated candies from gemSetData.urls (static collection):", 'color: magenta;', newCandies);
    }
    // Case 3: Single static image URL (only if it's a non-empty string)
    // IMPORTANT CHANGE: Added check for gemSetData.url.length > 0
    else if (typeof gemSetData.url === 'string' && gemSetData.url.length > 0) {
        console.warn("%c[script.js] Received single image URL for gemSet. Match-3 typically requires multiple distinct candy images. Using it as the only type for now.", 'color: orange;');
        newCandies.push(gemSetData.url);
    }
    // Case 4: Invalid or empty data (including an empty string URL) - fallback to default
    else {
        console.warn("%c[script.js]: Invalid or empty gemSet data received. Reverting to default candies.", 'color: orange;', gemSetData);
        candies = ["Blue", "Orange", "Green", "Yellow", "Red", "Purple"];
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
    // Add a log here to see what `candies` array looks like *before* picking.
    console.log("%c[script.js] randomCandy() called. Current 'candies' array:", 'color: cyan;', candies);

    const selectedCandy = candies[Math.floor(Math.random() * candies.length)];
    
    // Add a log here to see the selected candy and its determined source.
    let finalSrc;
    if (selectedCandy.includes('/')) {
        finalSrc = selectedCandy; // It's already a path (custom image)
    } else {
        finalSrc = `./images/${selectedCandy}.png`; // Construct path for default colors (e.g., Blue.png)
    }
    console.log(`%c[script.js] randomCandy() selected: "${selectedCandy}", returning: "${finalSrc}"`, 'color: cyan;');
    return finalSrc;
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

    // Calculate tile size dynamically based on window size and number of rows/columns
    // Max board dimension is 45% of window width, 80% of window height, or max 450px
    const maxBoardDimension = Math.min(window.innerWidth * 0.45, window.innerHeight * 0.8, 450);
    const actualTileSize = maxBoardDimension / Math.max(rows, columns);

    console.log(`%c[script.js] Calculated actualTileSize: ${actualTileSize}`, 'color: lightgreen;');
    console.log(`%c[script.js] Attempting to set boardElement styles:`, 'color: lightgreen;');
    console.log(`   width: ${actualTileSize * columns}px`);
    console.log(`   height: ${actualTileSize * rows}px`);
    console.log(`   display: grid`);
    console.log(`   gridTemplateColumns: repeat(${columns}, 1fr)`);
    console.log(`   gridTemplateRows: repeat(${rows}, 1fr)`);

    boardElement.style.width = `${actualTileSize * columns}px`;
    boardElement.style.height = `${actualTileSize * rows}px`;
    boardElement.style.display = 'grid';
    boardElement.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    // --- NEW DEBUG LOG: Check the inline style after setting ---
    console.log("%c[script.js] boardElement.style.cssText AFTER setting styles:", 'color: orange;', boardElement.style.cssText);


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
        if (checkValid()) {
            hasMatches = true;
        }
        attempts++;
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