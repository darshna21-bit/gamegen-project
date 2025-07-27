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
    #imageUrl = null;

    // Standard Flappy Bird pipe dimensions (adjust if your CSS is different)
    #PIPE_WIDTH = 60; // Standard Flappy Bird pipe width
    #PIPE_SEGMENT_HEIGHT = 300; // Standard Flappy Bird pipe segment height (height of one pipe image)

    // NEW: Collision adjustment constants (fine-tune these if needed)
    // Positive value makes the collision box smaller/more forgiving on that side
    // Negative value makes the collision box larger/less forgiving
    // Adjusted these to be more aggressive for testing
    #COLLISION_OFFSET_Y_TOP_PIPE = -20; // Making the top pipe's collision area extend downwards by 20px
    #COLLISION_OFFSET_Y_BOTTOM_PIPE = -5; // Making the bottom pipe's collision area extend upwards by 5px

    // Offset to account for the ::after pseudo-element on topPipe
    // This should match the height of your .topPipe::after in CSS
    #COLLISION_OFFSET_TOP_PIPE_AFTER_HEIGHT = 100;

    constructor(
        pipePosX,
        pipePosY,
        pipeGap,
        skyDOM,
        pipeSpeed
    ) {
        // Initialize constants from constructor arguments
        this.#skyDOM = skyDOM;
        this.#pipeGap = pipeGap;
        this.#pipeSpeed = pipeSpeed;

        // Initialize pipe position (randomized Y for variety)
        this.#pipePosX = pipePosX;
        this.#pipePosY = pipePosY + Math.random() * 200;

        // Initialize point flag
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
            this.#bottomPipe.style.backgroundSize = 'cover'; // Ensure image covers the pipe area
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
     * @param {Bird} bird - The bird object instance.
     * @returns {boolean} True if a collision occurs, false otherwise.
     */
    checkCollision(bird) {
        const birdPos = bird.getBirdPos(); // Get bird's current X and Y (bottom-left corner)
        const birdDOM = bird.getBirdDOM(); // Get bird's DOM element for actual rendered size

        // Safely get bird's actual rendered width and height
        // Fallback to default if DOM element is not ready or has no dimensions
        const birdWidth = birdDOM ? birdDOM.offsetWidth : 43; // Default bird width
        const birdHeight = birdDOM ? birdDOM.offsetHeight : 30; // Default bird height

        // Calculate Bird's Bounding Box (using its current position and dynamic dimensions)
        // birdPos.x is the 'left' CSS property, birdPos.y is the 'bottom' CSS property.
        // The Y-axis for CSS 'bottom' increases upwards.
        const birdLeftX = birdPos.x;
        const birdRightX = birdLeftX + birdWidth;
        const birdBottomY = birdPos.y;
        const birdTopY = birdBottomY + birdHeight;

        // Calculate Pipe's Bounding Boxes (using pipe's current position and fixed dimensions)
        const pipeLeftX = this.#pipePosX;
        const pipeRightX = this.#pipePosX + this.#PIPE_WIDTH;

        // Bottom pipe: Its bottom edge is at this.#pipePosY. Its top edge is at this.#pipePosY + this.#PIPE_SEGMENT_HEIGHT.
        const bottomPipeBottomEdge = this.#pipePosY;
        const bottomPipeTopEdge = this.#pipePosY + this.#PIPE_SEGMENT_HEIGHT;

        // Top pipe: The gap starts at bottomPipeTopEdge. The top pipe's bottom edge is at bottomPipeTopEdge + this.#pipeGap.
        // Its top edge is at topPipeBottomEdge + this.#PIPE_SEGMENT_HEIGHT.
        const topPipeBottomEdge = bottomPipeTopEdge + this.#pipeGap;
        const topPipeTopEdge = topPipeBottomEdge + this.#PIPE_SEGMENT_HEIGHT;

        // Apply collision offsets to the pipe edges
        const adjustedBottomPipeTopEdge = bottomPipeTopEdge + this.#COLLISION_OFFSET_Y_BOTTOM_PIPE;
        // Adjust top pipe's bottom edge to account for the ::after pseudo-element and the offset
        const adjustedTopPipeBottomEdge = topPipeBottomEdge + this.#COLLISION_OFFSET_Y_TOP_PIPE - this.#COLLISION_OFFSET_TOP_PIPE_AFTER_HEIGHT;


        // Console logs for detailed debugging (now using adjusted values)
        console.group("Collision Check Details");
        console.log(`Bird Pos (x, y): (${birdPos.x.toFixed(2)}, ${birdPos.y.toFixed(2)})`);
        console.log(`Bird Dimensions (W, H): (${birdWidth}, ${birdHeight})`);
        console.log(`Bird Bounding Box: [X: ${birdLeftX.toFixed(2)} to ${birdRightX.toFixed(2)}], [Y: ${birdBottomY.toFixed(2)} to ${birdTopY.toFixed(2)}]`);
        console.log(`Pipe Pos (x, y): (${this.#pipePosX.toFixed(2)}, ${this.#pipePosY.toFixed(2)})`);
        console.log(`Pipe Dimensions (W, H): (${this.#PIPE_WIDTH}, ${this.#PIPE_SEGMENT_HEIGHT})`);
        console.log(`Pipe Gap: ${this.#pipeGap}`);
        console.log(`Bottom Pipe Bounding Box (Original): [X: ${pipeLeftX.toFixed(2)} to ${pipeRightX.toFixed(2)}], [Y: ${bottomPipeBottomEdge.toFixed(2)} to ${bottomPipeTopEdge.toFixed(2)}]`);
        console.log(`Top Pipe Bounding Box (Original): [X: ${pipeLeftX.toFixed(2)} to ${pipeRightX.toFixed(2)}], [Y: ${topPipeBottomEdge.toFixed(2)} to ${topPipeTopEdge.toFixed(2)}]`);
        console.log(`Adjusted Bottom Pipe Top Edge: ${adjustedBottomPipeTopEdge.toFixed(2)}`);
        console.log(`Adjusted Top Pipe Bottom Edge: ${adjustedTopPipeBottomEdge.toFixed(2)}`);


        // 1. Check X-axis overlap
        const xOverlap = (birdRightX > pipeLeftX && birdLeftX < pipeRightX);
        console.log(`X-Overlap: ${xOverlap} (Bird RightX ${birdRightX.toFixed(2)} > Pipe LeftX ${pipeLeftX.toFixed(2)} AND Bird LeftX ${birdLeftX.toFixed(2)} < Pipe RightX ${pipeRightX.toFixed(2)})`);

        if (xOverlap) {
            // 2. If there's X-overlap, check Y-axis collision
            // The bird is SAFE if its entire vertical bounding box is within the pipe gap.
            // That means: bird's bottom is ABOVE the bottom pipe's adjusted top edge
            // AND bird's top is BELOW the top pipe's adjusted bottom edge.
            const isBirdSafeInGap = (birdBottomY > adjustedBottomPipeTopEdge && birdTopY < adjustedTopPipeBottomEdge);

            // Collision occurs if the bird is NOT safe in the gap.
            const yCollision = !isBirdSafeInGap;

            console.log(`Is Bird Safe In Gap: ${isBirdSafeInGap} (Bird BottomY ${birdBottomY.toFixed(2)} > Adjusted Bottom Pipe Top Edge ${adjustedBottomPipeTopEdge.toFixed(2)} AND Bird TopY ${birdTopY.toFixed(2)} < Adjusted Top Pipe Bottom Edge ${adjustedTopPipeBottomEdge.toFixed(2)})`);
            console.log(`Y-Collision (Overall): ${yCollision}`);

            console.groupEnd(); // End the console group
            if (yCollision) {
                return true;
            }
        }
        console.groupEnd(); // End the console group even if no X-overlap
        return false;
    }

    /**
     * Checks if the pipe has passed the bird's X position and awards a point if it hasn't already.
     * @returns {boolean} True if the pipe has passed and a point is awarded, false otherwise.
     */
    hasPassed() {
        // This now correctly checks if the pipe's right edge has passed the bird's fixed X position.
        const BIRD_PASS_X_THRESHOLD = 220; // This is BIRD_START_X from app.js
        if (this.#pipePosX + this.#PIPE_WIDTH < BIRD_PASS_X_THRESHOLD && !this.#hasPoint) {
            this.#hasPoint = true; // Mark as passed to prevent multiple points
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
        this.#bottomPipe.className = "pipe"; // Apply default CSS class
        this.#bottomPipe.style.left = this.#pipePosX + "px";
        this.#bottomPipe.style.bottom = this.#pipePosY + "px";
        // Set fixed dimensions for pipes based on constants
        this.#bottomPipe.style.width = `${this.#PIPE_WIDTH}px`;
        this.#bottomPipe.style.height = `${this.#PIPE_SEGMENT_HEIGHT}px`;
        // Add temporary visual border for debugging collision box
        // this.#bottomPipe.style.outline = '2px solid rgba(255, 0, 0, 0.5)';
           // Semi-transparent red border
        this.#skyDOM.appendChild(this.#bottomPipe);

        // Create top pipe element
        this.#topPipe = document.createElement("div");
        this.#topPipe.className = "topPipe"; // Apply default CSS class
        this.#topPipe.style.left = this.#pipePosX + "px";
        this.#topPipe.style.bottom = this.#pipePosY + this.#pipeGap + "px";
        // Set fixed dimensions for pipes based on constants
        this.#topPipe.style.width = `${this.#PIPE_WIDTH}px`;
        this.#topPipe.style.height = `${this.#PIPE_SEGMENT_HEIGHT}px`;
        // Add temporary visual border for debugging collision box
        // this.#topPipe.style.outline = '2px solid rgba(0, 0, 255, 0.5)'; 
        // Semi-transparent blue border
        this.#skyDOM.appendChild(this.#topPipe);

        // Apply custom image if available, overriding CSS background-image
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
            // Ensure default CSS background is used if no custom image is set
            this. #bottomPipe.style.backgroundImage = ''; // Corrected
            this. #topPipe.style.backgroundImage = ''; // Corrected
            this. #bottomPipe.style.backgroundSize = ''; // Corrected
            this. #topPipe.style.backgroundSize = ''; // Corrected
            this. #bottomPipe.style.backgroundRepeat = ''; // Corrected
            this. #topPipe.style.backgroundRepeat = ''; // Corrected
            this. #bottomPipe.style.backgroundPosition = ''; // Corrected
            this. #topPipe.style.backgroundPosition = ''; // Corrected
        }
    }

    /**
     * Gets the current X position of the pipe.
     * @returns {number} The X coordinate of the pipe.
     */
    getPosX() {
        return this.#pipePosX;
    }
}