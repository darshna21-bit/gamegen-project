// pipes.js
export class Pipe {
    // Constants (passed in constructor)
    #skyDOM;
    #pipeGap;
    #pipeSpeed;

    // Position
    #pipePosX;
    #pipePosY;

    // Pipe DOM Elements
    #bottomPipe;
    #topPipe;

    // Game State for points
    #hasPoint;

    // Stores the URL of the custom pipe image, if any
    #imageUrl = null; // Ensure this is initialized

    // Standard Flappy Bird pipe dimensions (adjust if your CSS is different)
    #PIPE_WIDTH = 60; // Standard Flappy Bird pipe width
    #PIPE_SEGMENT_HEIGHT = 300; // Standard Flappy Bird pipe segment height (height of one pipe image)

    // NEW: Collision adjustment constants (fine-tune these if needed)
    #COLLISION_OFFSET_Y_TOP_PIPE = -20;
    #COLLISION_OFFSET_Y_BOTTOM_PIPE = -5;

    // Offset to account for the ::after pseudo-element on topPipe
    #COLLISION_OFFSET_TOP_PIPE_AFTER_HEIGHT = 100;

    constructor(
        pipePosX,
        pipePosY,
        pipeGap,
        skyDOM,
        pipeSpeed
    ) {
        this.#skyDOM = skyDOM;
        this.#pipeGap = pipeGap;
        this.#pipeSpeed = pipeSpeed;

        this.#pipePosX = pipePosX;
        this.#pipePosY = pipePosY + Math.random() * 200;

        this.#hasPoint = false;
    }

    /**
     * Sets a custom image URL for the pipes.
     * This will be called from `app.js` when an 'obstacle' asset is updated.
     * @param {string} imageUrl - The URL of the new pipe image.
     */
    setImage(imageUrl) {
        this.#imageUrl = imageUrl;
        // If pipes are already drawn, update their background images immediately
        if (this.#bottomPipe && this.#topPipe) {
            this.#bottomPipe.style.backgroundImage = `url(${this.#imageUrl})`;
            this.#topPipe.style.backgroundImage = `url(${this.#imageUrl})`;
            // Ensure background properties are set to cover and repeat correctly
            this.#bottomPipe.style.backgroundSize = 'cover';
            this.#topPipe.style.backgroundSize = 'cover';
            this.#bottomPipe.style.backgroundRepeat = 'no-repeat';
            this.#topPipe.style.backgroundRepeat = 'no-repeat';
            this.#bottomPipe.style.backgroundPosition = 'center';
            this.#topPipe.style.backgroundPosition = 'center';
        }
    }

    /**
     * Updates the position of both top and bottom pipe elements.
     */
    update() {
        this.#pipePosX -= this.#pipeSpeed; // Move pipe left
        this.#bottomPipe.style.left = this.#pipePosX + "px";
        this.#topPipe.style.left = this.#pipePosX + "px";
    }

    /**
     * Removes the pipe elements from the DOM.
     */
    delete() {
        if (this.#bottomPipe && this.#skyDOM.contains(this.#bottomPipe)) {
            this.#skyDOM.removeChild(this.#bottomPipe);
        }
        if (this.#topPipe && this.#skyDOM.contains(this.#topPipe)) {
            this.#skyDOM.removeChild(this.#topPipe);
        }
    }

    /**
     * Checks for collision between the bird and the pipe.
     */
    checkCollision(bird) {
        const birdPos = bird.getBirdPos();
        const birdDOM = bird.getBirdDOM();

        const birdWidth = birdDOM ? birdDOM.offsetWidth : 43;
        const birdHeight = birdDOM ? birdDOM.offsetHeight : 30;

        const birdLeftX = birdPos.x;
        const birdRightX = birdLeftX + birdWidth;
        const birdBottomY = birdPos.y;
        const birdTopY = birdBottomY + birdHeight;

        const pipeLeftX = this.#pipePosX;
        const pipeRightX = this.#pipePosX + this.#PIPE_WIDTH;

        const bottomPipeBottomEdge = this.#pipePosY;
        const bottomPipeTopEdge = this.#pipePosY + this.#PIPE_SEGMENT_HEIGHT;

        const topPipeBottomEdge = bottomPipeTopEdge + this.#pipeGap;
        const topPipeTopEdge = topPipeBottomEdge + this.#PIPE_SEGMENT_HEIGHT;

        const adjustedBottomPipeTopEdge = bottomPipeTopEdge + this.#COLLISION_OFFSET_Y_BOTTOM_PIPE;
        const adjustedTopPipeBottomEdge = topPipeBottomEdge + this.#COLLISION_OFFSET_Y_TOP_PIPE - this.#COLLISION_OFFSET_TOP_PIPE_AFTER_HEIGHT;

        // X-axis overlap
        const xOverlap = (birdRightX > pipeLeftX && birdLeftX < pipeRightX);

        if (xOverlap) {
            // Y-axis collision
            const isBirdSafeInGap = (birdBottomY > adjustedBottomPipeTopEdge && birdTopY < adjustedTopPipeBottomEdge);
            const yCollision = !isBirdSafeInGap;

            if (yCollision) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if the pipe has passed the bird's X position and awards a point if it hasn't already.
     */
    hasPassed() {
        const BIRD_PASS_X_THRESHOLD = 220; // This is BIRD_START_X from app.js
        if (this.#pipePosX + this.#PIPE_WIDTH < BIRD_PASS_X_THRESHOLD && !this.#hasPoint) {
            this.#hasPoint = true;
            return true;
        }
        return false;
    }

    /**
     * Creates and appends the pipe DOM elements to the game display.
     */
    draw() {
        // Create bottom pipe element
        this.#bottomPipe = document.createElement("div");
        this.#bottomPipe.className = "pipe";
        this.#bottomPipe.style.left = this.#pipePosX + "px";
        this.#bottomPipe.style.bottom = this.#pipePosY + "px";
        this.#bottomPipe.style.width = `${this.#PIPE_WIDTH}px`;
        this.#bottomPipe.style.height = `${this.#PIPE_SEGMENT_HEIGHT}px`;
        this.#skyDOM.appendChild(this.#bottomPipe);

        // Create top pipe element
        this.#topPipe = document.createElement("div");
        this.#topPipe.className = "topPipe";
        this.#topPipe.style.left = this.#pipePosX + "px";
        this.#topPipe.style.bottom = this.#pipePosY + this.#pipeGap + "px";
        this.#topPipe.style.width = `${this.#PIPE_WIDTH}px`;
        this.#topPipe.style.height = `${this.#PIPE_SEGMENT_HEIGHT}px`;
        this.#skyDOM.appendChild(this.#topPipe);

        // Apply custom image if available (will use #imageUrl, which is updated by setImage)
        if (this.#imageUrl) {
            this.#bottomPipe.style.backgroundImage = `url(${this.#imageUrl})`;
            this.#topPipe.style.backgroundImage = `url(${this.#imageUrl})`;
            this.#bottomPipe.style.backgroundSize = 'cover';
            this.#topPipe.style.backgroundSize = 'cover';
            this.#bottomPipe.style.backgroundRepeat = 'no-repeat';
            this.#topPipe.style.backgroundRepeat = 'no-repeat';
            this.#bottomPipe.style.backgroundPosition = 'center';
            this.#topPipe.style.backgroundPosition = 'center';
        } else {
            // FIXED: Removed the incorrect 'this. #' syntax here.
            // Ensure default CSS background is used if no custom image is set by clearing inline styles
            this.#bottomPipe.style.backgroundImage = ''; 
            this.#topPipe.style.backgroundImage = ''; 
            this.#bottomPipe.style.backgroundSize = ''; 
            this.#topPipe.style.backgroundSize = ''; 
            this.#bottomPipe.style.backgroundRepeat = ''; 
            this.#topPipe.style.backgroundRepeat = ''; 
            this.#bottomPipe.style.backgroundPosition = ''; 
            this.#topPipe.style.backgroundPosition = ''; 
        }
    }

    /**
     * Gets the current X position of the pipe.
     */
    getPosX() {
        return this.#pipePosX;
    }
}