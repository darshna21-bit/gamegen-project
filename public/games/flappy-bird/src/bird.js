// bird.js
// Animation names for default CSS animation
const BIRD_DOWN_FLAP = "bird-downflap";
const BIRD_MID_FLAP = "bird-midflap";
const BIRD_UP_FLAP = "bird-upflap";

export class Bird {
  // DOM element for the bird
  #birdDOM;
  #birdImageDOM; // NEW: Reference for the <img> tag

  // Game constants/physics properties
  #gravity;
  #lift;
  #jumpHeight;
  #maxHeight;
  #maxRotation;

  // Bird's current state (position, speed, rotation)
  #birdPosX;
  #birdPosY;
  #vertSpeed;
  #rotation;

  // Sound effects
  #flySound;
  #diveSound; // Not used in provided code, but kept for completeness

  // --- START NEW/MODIFIED PROPERTIES FOR ASSET HANDLING ---
  // Array of CSS classes for the default bird's flapping animation
  #flapAnimation = [BIRD_DOWN_FLAP, BIRD_MID_FLAP, BIRD_UP_FLAP, BIRD_MID_FLAP];
  #currentFlap = 0; // Current index in the #flapAnimation array
  #prevFlap = 0; // Previous index for removing CSS class

  // Flags and data for dynamically loaded animated assets (sprite sheets)
  #isAnimatedAsset = false; // True if the current bird is an animated sprite sheet
  #assetPrefix = null; // Base URL for sprite frames (e.g., '/ai_assets/red bird/flying/frame-')
  #assetFrameCount = 0; // Total number of frames in the sprite animation
  #assetFrameWidth = 0; // Width of a single frame in the sprite sheet
  #assetFrameHeight = 0; // Height of a single frame in the sprite sheet
  #currentAssetFrame = 0; // Current frame index for the dynamic sprite animation
  #isFrameOneIndexed = false; // NEW: Flag to indicate if frames are 1-indexed (e.g., 'frame-1.png')
  // --- END NEW/MODIFIED PROPERTIES FOR ASSET HANDLING ---

  constructor(
    birdStartX,
    birdStartY,
    gravity,
    lift,
    jumpHeight,
    maxHeight,
    maxRotation,
    birdDOM,
    flySound
  ) {
    // Initialize DOM element
    this.#birdDOM = birdDOM;
    // NEW: Create an <img> element and append it to the birdDOM
    this.#birdImageDOM = document.createElement('img');
    this.#birdImageDOM.style.width = '100%'; // Make image fill the div
    this.#birdImageDOM.style.height = '100%';
    this.#birdImageDOM.style.objectFit = 'contain'; // Ensure image fits without cropping
    this.#birdDOM.appendChild(this.#birdImageDOM);
    console.log("[Bird.js Debug]: Constructor: Created <img> element for bird image.");


    // Initialize bird's starting state
    this.#birdPosX = birdStartX;
    this.#birdPosY = birdStartY;
    this.#vertSpeed = 0;
    this.#rotation = 0;

    // Initialize physics constants
    this.#gravity = gravity;
    this.#lift = lift;
    this.#jumpHeight = jumpHeight;
    this.#maxHeight = maxHeight;
    this.#maxRotation = maxRotation;

    // Set initial DOM styles for position and rotation
    this.applyPositionAndRotation(); // Call this once in constructor

    // Initialize sounds
    this.#flySound = flySound;

    // Immediately apply default bird image and classes in constructor
    this.#isAnimatedAsset = false;
    try {
        // Use the <img> tag for the image source
        this.#birdImageDOM.src = `assets/images/yellowbird-midflap.png`;
        this.#birdDOM.style.width = `43px`;
        this.#birdDOM.style.height = `30px`;
        // Clear background-image from the div itself
        this.#birdDOM.style.setProperty('background-image', ''); 
        console.log("[Bird.js Debug]: Constructor: Default background-image set to:", this.#birdImageDOM.src);
    } catch (e) {
        console.error("[Bird.js Debug]: Constructor: Error setting default background image styles:", e);
    }
    this.#birdDOM.classList.add(this.#flapAnimation[0]); // Add initial default CSS class
    console.log("[Bird.js Debug]: Bird constructor: Default yellow bird applied.");
  }

  /**
   * Helper method to apply current position and rotation to DOM.
   * This centralizes the DOM updates for position/rotation.
   */
  applyPositionAndRotation() {
    this.#birdDOM.style.bottom = `${this.#birdPosY}px`;
    this.#birdDOM.style.left = `${this.#birdPosX}px`;
    this.#birdDOM.style.transform = `rotate(${this.#rotation}deg)`;
    // console.log(`[Bird.js Debug]: Bird position updated: X=${this.#birdPosX}, Y=${this.#birdPosY}, Rot=${this.#rotation}`); // Too verbose
  }

  /**
   * Sets the bird's gravity.
   * @param {number} newGravity - The new gravity value.
   */
  setGravity(newGravity) {
    this.#gravity = newGravity;
  }

  /**
   * Sets the bird's visual appearance, handling both static image URLs and animated sprite sheet data.
   * This is the core method for applying AI-generated assets.
   * @param {object | string | null} assetData - Can be a string URL for a static image,
   * or an object containing { url, isAnimated, prefix, count, frameWidth, frameHeight }
   * for an animated sprite sheet. Pass null to revert to default CSS bird.
   */
  setImage(assetData) {
    console.log("[Bird.js Debug]: setImage called with assetData:", assetData);
    console.log("[Bird.js Debug]: Bird DOM element:", this.#birdDOM); // Log the element itself

    // 1. Clear any existing CSS animation classes from the bird element
    this.#flapAnimation.forEach(cls => this.#birdDOM.classList.remove(cls));
    console.log("[Bird.js Debug]: Removed all flap animation classes.");

    // 2. Reset background image related styles to ensure a clean slate
    try {
        this.#birdDOM.style.setProperty('background-image', ''); // Ensure div's background-image is clear
        this.#birdDOM.style.backgroundSize = '';
        this.#birdDOM.style.backgroundPosition = '';
        this.#birdDOM.style.backgroundRepeat = '';
        console.log("[Bird.js Debug]: Cleared div's background image styles. Current div background-image:", this.#birdDOM.style.backgroundImage);
    } catch (e) {
        console.error("[Bird.js Debug]: Error clearing background image styles:", e);
    }


    // Reset dimensions to default initially, then potentially override
    // Use current computed width/height or default if not available
    const currentWidth = this.#birdDOM.offsetWidth > 0 ? this.#birdDOM.offsetWidth : 43;
    const currentHeight = this.#birdDOM.offsetHeight > 0 ? this.#birdDOM.offsetHeight : 30;
    this.#birdDOM.style.width = `${currentWidth}px`; 
    this.#birdDOM.style.height = `${currentHeight}px`; 
    console.log(`[Bird.js Debug]: Reset bird DOM dimensions to current computed values (${currentWidth}x${currentHeight}px, for safety).`);


    if (assetData && typeof assetData === 'object' && assetData.isAnimated) {
      console.log("[Bird.js Debug]: setImage: Handling animated asset.");
      this.#isAnimatedAsset = true;
      this.#assetPrefix = assetData.prefix;
      this.#assetFrameCount = assetData.count;
      this.#assetFrameWidth = assetData.frameWidth; 
      this.#assetFrameHeight = assetData.frameHeight; 
      this.#currentAssetFrame = 0; // Start animation from the first frame

      // Determine if frames are 1-indexed based on prefix
      this.#isFrameOneIndexed = this.#assetPrefix.includes('frame-');
      console.log(`[Bird.js Debug]: Animated asset prefix: ${this.#assetPrefix}, isFrameOneIndexed: ${this.#isFrameOneIndexed}`);
      console.log(`[Bird.js Debug]: Received frameWidth: ${this.#assetFrameWidth}, frameHeight: ${this.#assetFrameHeight}`);


      // Set the bird DOM element's dimensions to match a single frame of the sprite
      this.#birdDOM.style.width = `${this.#assetFrameWidth}px`;
      this.#birdDOM.style.height = `${this.#assetFrameHeight}px`;
      console.log(`[Bird.js Debug]: Set animated bird DOM dimensions to: ${this.#assetFrameWidth}x${this.#assetFrameHeight}px`);

      // Set the image source for the <img> tag
      const initialFrameIndex = this.#isFrameOneIndexed ? this.#currentAssetFrame + 1 : this.#currentAssetFrame;
      let paddedIndex = String(initialFrameIndex);
      if (this.#assetPrefix.includes('skeleton-animation_')) {
          paddedIndex = paddedIndex.padStart(2, '0');
      } else if (this.#assetPrefix.includes('man')) {
          paddedIndex = paddedIndex.padStart(3, '0');
      } else if (this.#assetPrefix.includes('frame-')) {
          // No extra padding needed for frame-1.png etc.
      }

      const initialFrameUrl = `${this.#assetPrefix}${paddedIndex}.png`;
      const finalImageUrl = assetData.imageUrl || initialFrameUrl;
      console.log(`[Bird.js Debug]: Final Image URL for animated asset (for <img>): ${finalImageUrl}`);
      try {
          this.#birdImageDOM.src = finalImageUrl; // Set src for <img>
          console.log(`[Bird.js Debug]: Set <img> src to: ${this.#birdImageDOM.src}`);
      } catch (e) {
          console.error("[Bird.js Debug]: Error setting animated <img> src:", e);
      }
      this.applyPositionAndRotation(); // Ensure position is applied after size change
    } else if (assetData && (typeof assetData === 'string' || (typeof assetData === 'object' && assetData.url))) {
      console.log("[Bird.js Debug]: setImage: Handling static image asset.");
      this.#isAnimatedAsset = false;
      this.#assetPrefix = null;
      this.#assetFrameCount = 0;
      this.#currentAssetFrame = 0;
      this.#isFrameOneIndexed = false; // Reset for static images

      const imageUrl = typeof assetData === 'string' ? assetData : assetData.url;
      console.log("[Bird.js Debug]: Attempting to load static bird image from URL:", imageUrl);

      const img = new Image();
      img.onload = () => {
        console.log(`[Bird.js Debug]: Static image loaded: ${imageUrl}, Natural dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
        // Set bird DOM element dimensions based on loaded image's intrinsic size
        this.#birdDOM.style.width = `${img.naturalWidth}px`;
        this.#birdDOM.style.height = `${img.naturalHeight}px`;
        console.log(`[Bird.js Debug]: Set static bird DOM dimensions to: ${img.naturalWidth}x${img.naturalHeight}px`);

        // Apply image source to the <img> tag
        try {
            this.#birdImageDOM.src = imageUrl; // Set src for <img>
            console.log(`[Bird.js Debug]: Set <img> src to: ${this.#birdImageDOM.src}`);
        } catch (e) {
            console.error("[Bird.js Debug]: Error setting static <img> src:", e);
        }

        // Important: Re-apply bird's current position after dimensions might have changed
        // This ensures it's visually aligned correctly after resize.
        this.applyPositionAndRotation();
      };
      img.onerror = () => {
        console.error("[Bird.js Debug]: Failed to load bird image:", imageUrl);
        // Fallback to default bird if image fails to load
        this.setImage(null);
      };
      img.src = imageUrl;
    } else {
      console.log("[Bird.js Debug]: setImage: Reverting to default CSS bird.");
      this.#isAnimatedAsset = false;
      this.#assetPrefix = null;
      this.#assetFrameCount = 0;
      this.#currentAssetFrame = 0;
      this.#isFrameOneIndexed = false; // Reset for default

      // Explicitly set default image path and dimensions for CSS-based bird
      try {
          this.#birdImageDOM.src = `assets/images/yellowbird-midflap.png`; // Set src for <img>
          this.#birdDOM.style.width = `43px`;
          this.#birdDOM.style.height = `30px`;
          // Clear background-image from the div itself
          this.#birdDOM.style.setProperty('background-image', ''); 
          console.log("[Bird.js Debug]: Applied default yellow bird image and class. Current <img> src:", this.#birdImageDOM.src);
      } catch (e) {
          console.error("[Bird.js Debug]: Error setting default background image styles:", e);
      }
      // Re-add the initial default CSS class for flapping animation
      this.#birdDOM.classList.add(this.#flapAnimation[0]); // Re-add a default class
      this.applyPositionAndRotation(); // Ensure position is applied for default bird
    }
  }

  /**
   * Resets the bird's position and internal state to its initial default,
   * WITHOUT changing its current image/asset.
   * This is called when the game restarts or a new asset is applied.
   * @param {number} startX - Initial X position.
   * @param {number} startY - Initial Y position.
   */
  reset(startX, startY) {
    console.log(`[Bird.js Debug]: reset called: Setting bird to StartX=${startX}, StartY=${startY}`);
    this.#birdPosX = startX;
    this.#birdPosY = startY;
    this.#vertSpeed = 0;
    this.#rotation = 0;
    this.applyPositionAndRotation(); // Use the helper method
    // Ensure display is block (in case it was hidden by some previous state)
    this.#birdDOM.style.display = 'block';

    // When resetting, if it's not an animated asset, ensure a default flap class is active
    if (!this.#isAnimatedAsset) {
      console.log("[Bird.js Debug]: Resetting flap animation classes for non-animated bird.");
      this.#flapAnimation.forEach(cls => this.#birdDOM.classList.remove(cls)); // Clear all
      this.#currentFlap = 0; // Reset flap index
      this.#birdDOM.classList.add(this.#flapAnimation[this.#currentFlap]); // Add initial
    }
  }

  /**
   * Performs the default CSS-based flapping animation by cycling CSS classes.
   * This method is called when isAnimatedAsset is false.
   */
  flap() {
    // Only manage CSS classes for flapping. The background-image is set by setImage.
    this.#prevFlap = this.#currentFlap;
    this.#currentFlap = (this.#currentFlap + 1) % this.#flapAnimation.length;
    this.#birdDOM.classList.remove(this.#flapAnimation[this.#prevFlap]);
    this.#birdDOM.classList.add(this.#flapAnimation[this.#currentFlap]);
    // console.log(`Flap: Applied class ${this.#flapAnimation[this.#currentFlap]}`); // Too verbose, uncomment if needed
  }

  /**
   * Animates the bird using a sprite sheet by changing the background image URL
   * to the next frame in the sequence.
   * This method is called when isAnimatedAsset is true.
   */
  animateSprite() {
    if (this.#isAnimatedAsset && this.#assetPrefix && this.#assetFrameCount > 0) {
      this.#currentAssetFrame = (this.#currentAssetFrame + 1) % this.#assetFrameCount;
      // Adjust frame index based on #isFrameOneIndexed
      const frameIndexToUse = this.#isFrameOneIndexed ? this.#currentAssetFrame + 1 : this.#currentAssetFrame;
      
      // Use padStart for consistent formatting based on prefix types
      let paddedIndex = String(frameIndexToUse);
      if (this.#assetPrefix.includes('skeleton-animation_')) {
          paddedIndex = paddedIndex.padStart(2, '0');
      } else if (this.#assetPrefix.includes('man')) {
          paddedIndex = paddedIndex.padStart(3, '0');
      } else if (this.#assetPrefix.includes('frame-')) {
          // 'frame-' already handles +1 in its index, no extra padding needed here usually
          // but if your files are frame-01.png, frame-02.png etc. you might need it.
          // For now, assuming frame-1.png, frame-2.png etc.
      }
      
      const frameUrl = `${this.#assetPrefix}${paddedIndex}.png`;
      
      // console.log("animateSprite: Attempting to load animated frame:", frameUrl); // Uncomment if needed for debugging
      try {
          this.#birdImageDOM.src = frameUrl; // Set src for <img>
          console.log(`[Bird.js Debug]: animateSprite: Set <img> src to: ${this.#birdImageDOM.src}`);
      } catch (e) {
          console.error("[Bird.js Debug]: Error setting animated sprite <img> src:", e);
      }
    } else {
      console.warn("[Bird.js Debug]: animateSprite called but bird is not configured for animated asset or missing prefix/count.");
    }
  }

  /**
   * Updates the bird's vertical position and rotation based on gravity and vertical speed.
   * @param {number} lastTime - Time elapsed since last jump (used for acceleration).
   */
  update(lastTime) {
    this.#vertSpeed = Number(
      (
        this.#vertSpeed +
        (this.#gravity + (this.#gravity * lastTime) / 1000)
      ).toFixed(2)
    );
    this.#birdPosY -= this.#vertSpeed;
    if (this.#birdPosY <= 0) {
      this.#birdPosY = 0;
    }

    this.#rotation = Math.min(this.#maxRotation, this.#vertSpeed * 7);
    this.applyPositionAndRotation(); // Use the helper method
  }

  /**
   * Makes the bird jump by applying an upward vertical speed.
   */
  jump() {
    this.#vertSpeed = this.#lift;
    this.#birdPosY += this.#jumpHeight;
    if (this.#birdPosY >= this.#maxHeight) {
      this.#birdPosY = this.#maxHeight;
    }
    this.applyPositionAndRotation(); // Use the helper method
    this.#flySound.currentTime = 0;
    this.#flySound.play();
  }

  /**
   * Sets the bird's vertical speed to a small positive value, simulating a bounce or fall after collision.
   */
  setZeroSpeed() {
    this.#vertSpeed = 2;
  }

  /**
   * Gets the bird's current position.
   * @returns {{x: number, y: number}} Object with x and y coordinates.
   */
  getBirdPos() {
    return {
      x: this.#birdPosX,
      y: this.#birdPosY,
    };
  }

  /**
   * Gets the bird's current Y position.
   * @returns {number} Bird's Y coordinate.
   */
  getPosY() {
    return this.#birdPosY;
  }

  /**
   * Returns whether the current bird asset is an animated sprite sheet.
   * @returns {boolean} True if the asset is animated, false otherwise.
   */
  getIsAnimatedAsset() {
    return this.#isAnimatedAsset;
  }
}
