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

  // Collision dimensions for bird and pipe.
  // These are now class-level constants.
  #BIRD_COLLISION_WIDTH = 43;  // From bird.js default width
  #BIRD_COLLISION_HEIGHT = 30; // From bird.js default height
  #PIPE_WIDTH = 60;            // Standard Flappy Bird pipe width, confirm from your CSS/images
  #PIPE_SEGMENT_HEIGHT = 300;  // Standard Flappy Bird pipe segment height, confirm from your CSS/images

  constructor(
    pipePosX,
    pipePosY,
    pipeGap,
    skyDOM,
    pipeSpeed
    // The old collision parameters (pipeCollisionEndX, etc.) are removed from here.
  ) {
    // Initialize constants from constructor arguments
    this.#skyDOM = skyDOM;
    this.#pipeGap = pipeGap;
    this.#pipeSpeed = pipeSpeed;

    // Initialize pipe position (randomized Y for variety)
    this.#pipePosX = pipePosX;
    this.#pipePosY = pipePosY + Math.random() * 200;

    // The old collision constant initializations are removed from here.

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
   * @param {number} birdPosY - The current Y position of the bird (its bottom edge).
   * @returns {boolean} True if a collision occurs, false otherwise.
   */
  checkCollision(birdPosY) {
    // Calculate Bird's Bounding Box (assuming birdPosY is its bottom edge, BIRD_START_X is its left edge)
    // BIRD_START_X is a constant from app.js (220).
    const BIRD_START_X = 220;
    const birdLeftX = BIRD_START_X;
    const birdRightX = birdLeftX + this.#BIRD_COLLISION_WIDTH;
    const birdBottomY = birdPosY;
    const birdTopY = birdPosY + this.#BIRD_COLLISION_HEIGHT;

    // Calculate Pipe's Bounding Boxes
    const pipeLeftX = this.#pipePosX;
    const pipeRightX = this.#pipePosX + this.#PIPE_WIDTH;

    // Bottom pipe: extends from this.#pipePosY upwards for #PIPE_SEGMENT_HEIGHT
    const bottomPipeCollisionTopEdge = this.#pipePosY + this.#PIPE_SEGMENT_HEIGHT;

    // Top pipe: The gap starts at bottomPipeCollisionTopEdge and is this.#pipeGap tall.
    // So the top pipe's bottom edge is at bottomPipeCollisionTopEdge + this.#pipeGap
    const topPipeCollisionBottomEdge = bottomPipeCollisionTopEdge + this.#pipeGap;

    // 1. Check X-axis overlap
    const xOverlap = (birdRightX > pipeLeftX && birdLeftX < pipeRightX);

    if (xOverlap) {
        // 2. If there's X-overlap, check Y-axis collision
        // Collision occurs if the bird's top is below the top of the bottom pipe OR
        // if the bird's bottom is above the bottom of the top pipe.
        const yCollision = (birdTopY < bottomPipeCollisionTopEdge || birdBottomY > topPipeCollisionBottomEdge);

        if (yCollision) {
            console.log("Collision detected!");
            console.log(`Bird X: [${birdLeftX}, ${birdRightX}], Y: [${birdBottomY}, ${birdTopY}]`);
            console.log(`Pipe X: [${pipeLeftX}, ${pipeRightX}]`);
            console.log(`Bottom Pipe Top Y: ${bottomPipeCollisionTopEdge}`);
            console.log(`Top Pipe Bottom Y: ${topPipeCollisionBottomEdge}`);
            return true;
        }
    }

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
    this.#skyDOM.appendChild(this.#bottomPipe);

    // Create top pipe element
    this.#topPipe = document.createElement("div");
    this.#topPipe.className = "topPipe"; // Apply default CSS class
    this.#topPipe.style.left = this.#pipePosX + "px";
    this.#topPipe.style.bottom = this.#pipePosY + this.#pipeGap + "px";
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
   * @returns {number} The X coordinate of the pipe.
   */
  getPosX() {
    return this.#pipePosX;
  }
}
