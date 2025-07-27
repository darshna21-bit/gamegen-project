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
    #diveSound; 

    // --- START NEW/MODIFIED PROPERTIES FOR ASSET HANDLING ---
    #flapAnimation = [BIRD_DOWN_FLAP, BIRD_MID_FLAP, BIRD_UP_FLAP, BIRD_MID_FLAP];
    #currentFlap = 0; 
    #prevFlap = 0; 

    #isAnimatedAsset = false; 
    #assetPrefix = null; 
    #assetFrameCount = 0; 
    #assetFrameWidth = 0; 
    #assetFrameHeight = 0; 
    #currentAssetFrame = 0; 
    #isFrameOneIndexed = false; 
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
        this.applyPositionAndRotation(); 

        // Initialize sounds
        this.#flySound = flySound;

        // MODIFIED: Use the EXPORTED_BIRD_IMAGE global if available, else fallback to default.
        // This ensures the exported game picks up the AI-generated bird.
        this.#isAnimatedAsset = false;
        const defaultBirdWidth = 43; 
        const defaultBirdHeight = 30; 
        try {
            // Check if EXPORTED_CURRENT_ASSETS (which contains EXPORTED_BIRD_IMAGE) is defined
            // and if character asset is available, use it. Otherwise, use the default path.
            this.#birdImageDOM.src = (typeof EXPORTED_CURRENT_ASSETS !== 'undefined' && EXPORTED_CURRENT_ASSETS.character) 
                                    ? EXPORTED_CURRENT_ASSETS.character 
                                    : `assets/images/yellowbird-midflap.png`; 

            this.#birdDOM.style.width = `${defaultBirdWidth}px`; 
            this.#birdDOM.style.height = `${defaultBirdHeight}px`; 
            // Ensure no background-image on the div, as we are using an <img> tag now
            this.#birdDOM.style.setProperty('background-image', 'none', 'important'); 
            console.log("[Bird.js Debug]: Constructor: Bird image set to:", this.#birdImageDOM.src.substring(0, 50) + "...");
        } catch (e) {
            console.error("[Bird.js Debug]: Constructor: Error setting default/exported bird image styles:", e);
        }
        // This class might still be used for animation, even if the image is set via src
        this.#birdDOM.classList.add(this.#flapAnimation[0]); 
        console.log("[Bird.js Debug]: Bird constructor: Initial bird appearance applied.");
    }

    /**
     * Helper method to apply current position and rotation to DOM.
     */
    applyPositionAndRotation() {
        this.#birdDOM.style.bottom = `${this.#birdPosY}px`;
        this.#birdDOM.style.left = `${this.#birdPosX}px`;
        this.#birdDOM.style.transform = `rotate(${this.#rotation}deg)`;
    }

    /**
     * Sets the bird's gravity.
     */
    setGravity(newGravity) {
        this.#gravity = newGravity;
    }

    /**
     * Sets the bird's visual appearance, handling both static image URLs and animated sprite sheet data.
     * This is the core method for applying AI-generated assets.
     */
    setImage(assetData) {
        console.log("[Bird.js Debug]: setImage called with assetData:", assetData);

        // 1. Clear any existing CSS animation classes from the bird element
        this.#flapAnimation.forEach(cls => this.#birdDOM.classList.remove(cls));
        console.log("[Bird.js Debug]: Removed all flap animation classes.");

        // 2. Clear background-image from the div itself (ensures no conflicting background on the div)
        try {
            this.#birdDOM.style.setProperty('background-image', 'none', 'important'); 
            this.#birdDOM.style.backgroundSize = '';
            this.#birdDOM.style.backgroundPosition = '';
            this.#birdDOM.style.backgroundRepeat = '';
            console.log("[Bird.js Debug]: Cleared div's background image styles.");
        } catch (e) {
            console.error("[Bird.js Debug]: Error clearing background image styles:", e);
        }

        const defaultBirdWidth = 43; 
        const defaultBirdHeight = 30; 
        let finalImageUrl = null; 

        if (assetData && typeof assetData === 'object' && assetData.isAnimated) { 
            console.log("[Bird.js Debug]: setImage: Handling animated asset.");
            this.#isAnimatedAsset = true;
            this.#assetPrefix = assetData.prefix;
            this.#assetFrameCount = assetData.count;
            this.#assetFrameWidth = assetData.frameWidth || defaultBirdWidth; 
            this.#assetFrameHeight = assetData.frameHeight || defaultBirdHeight; 
            this.#currentAssetFrame = 0; 
            this.#isFrameOneIndexed = this.#assetPrefix.includes('frame-');

            this.#birdDOM.style.width = `${this.#assetFrameWidth}px`;
            this.#birdDOM.style.height = `${this.#assetFrameHeight}px`;

            const initialFrameIndex = this.#isFrameOneIndexed ? this.#currentAssetFrame + 1 : this.#currentAssetFrame;
            let paddedIndex = String(initialFrameIndex);
            if (this.#assetPrefix.includes('skeleton-animation_')) {
                paddedIndex = paddedIndex.padStart(2, '0');
            } else if (this.#assetPrefix.includes('man')) {
                paddedIndex = paddedIndex.padStart(3, '0');
            } else if (this.#assetPrefix.includes('frame-')) {
                // No extra padding needed
            }
            finalImageUrl = `${this.#assetPrefix}${paddedIndex}.png`;
            if (assetData.imageUrl) { // Use direct image URL if provided (e.g., Base64 for first frame)
                finalImageUrl = assetData.imageUrl;
            }
            console.log(`[Bird.js Debug]: Final Image URL for animated asset (for <img>): ${finalImageUrl.substring(0, 50)}...`);

        } else if (assetData && (typeof assetData === 'string' || (typeof assetData === 'object' && (assetData.url || assetData.imageUrl)))) {
            console.log("[Bird.js Debug]: setImage: Handling static image asset.");
            this.#isAnimatedAsset = false;
            this.#assetPrefix = null;
            this.#assetFrameCount = 0;
            this.#currentAssetFrame = 0;
            this.#isFrameOneIndexed = false; 

            // Robustly get the image URL from string or object (prioritize imageUrl)
            finalImageUrl = typeof assetData === 'string' ? assetData : (assetData.imageUrl || assetData.url);

            console.log("[Bird.js Debug]: Attempting to load static bird image from URL:", finalImageUrl.substring(0, 50));

        } else { // Reverting to default CSS bird (assetData is null or invalid)
            console.log("[Bird.js Debug]: setImage: Reverting to default CSS bird due to no valid URL found.");
            this.#isAnimatedAsset = false;
            this.#assetPrefix = null;
            this.#assetFrameCount = 0;
            this.#currentAssetFrame = 0;
            this.#isFrameOneIndexed = false; 

            try {
                this.#birdImageDOM.src = `assets/images/yellowbird-midflap.png`; // Set src for <img>
                this.#birdDOM.style.width = `${defaultBirdWidth}px`; 
                this.#birdDOM.style.height = `${defaultBirdHeight}px`; 
                this.#birdDOM.style.setProperty('background-image', 'none', 'important'); 
                console.log("[Bird.js Debug]: Applied default yellow bird image and class. Current <img> src:", this.#birdImageDOM.src.substring(0, 50) + "...");
            } catch (e) {
                console.error("[Bird.js Debug]: Error setting default bird image styles:", e);
            }
            this.#birdDOM.classList.add(this.#flapAnimation[0]); 
            this.applyPositionAndRotation(); 
            return; 
        }

        // Common logic for loading and applying the image (for both animated and static)
        if (finalImageUrl) {
            const img = new Image();
            img.onload = () => {
                console.log(`[Bird.js Debug]: Image loaded: ${finalImageUrl.substring(0, 50)}..., Natural dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
                
                if (!this.#isAnimatedAsset) {
                    this.#birdDOM.style.width = `${defaultBirdWidth}px`;
                    this.#birdDOM.style.height = `${defaultBirdHeight}px`;
                    console.log(`[Bird.js Debug]: Set static bird DOM dimensions to FIXED: ${defaultBirdWidth}x${defaultBirdHeight}px`);
                }

                try {
                    this.#birdImageDOM.src = finalImageUrl; 
                    console.log(`[Bird.js Debug]: Set <img> src to: ${this.#birdImageDOM.src.substring(0, 50)}...`);
                } catch (e) {
                    console.error("[Bird.js Debug]: Error setting <img> src:", e);
                }
                this.applyPositionAndRotation(); 
            };
            img.onerror = () => {
                console.error("[Bird.js Debug]: Failed to load bird image:", finalImageUrl.substring(0, 50));
                this.setImage(null); 
            };
            img.src = finalImageUrl; 
        } else {
            console.warn("[Bird.js Debug]: setImage: No valid finalImageUrl found to load.");
            this.setImage(null); 
        }
    }

    /**
     * Resets the bird's position and internal state to its initial default,
     * WITHOUT changing its current image/asset.
     */
    reset(startX, startY) {
        console.log(`[Bird.js Debug]: reset called: Setting bird to StartX=${startX}, StartY=${startY}`);
        this.#birdPosX = startX;
        this.#birdPosY = startY;
        this.#vertSpeed = 0;
        this.#rotation = 0;
        this.applyPositionAndRotation();
        this.#birdDOM.style.display = 'block';

        this.#flapAnimation.forEach(cls => this.#birdDOM.classList.remove(cls));
        if (!this.#isAnimatedAsset) {
            console.log("[Bird.js Debug]: Resetting flap animation classes for non-animated bird.");
            this.#currentFlap = 0;
            this.#birdDOM.classList.add(this.#flapAnimation[this.#currentFlap]);
        }
    }

    /**
     * Performs the default CSS-based flapping animation by cycling CSS classes.
     */
    flap() {
        this.#prevFlap = this.#currentFlap;
        this.#currentFlap = (this.#currentFlap + 1) % this.#flapAnimation.length;
        this.#birdDOM.classList.remove(this.#flapAnimation[this.#prevFlap]);
        this.#birdDOM.classList.add(this.#flapAnimation[this.#currentFlap]);
    }

    /**
     * Animates the bird using a sprite sheet by changing the background image URL
     * to the next frame in the sequence.
     */
    animateSprite() {
        if (this.#isAnimatedAsset && this.#assetPrefix && this.#assetFrameCount > 0) {
            this.#currentAssetFrame = (this.#currentAssetFrame + 1) % this.#assetFrameCount;
            const frameIndexToUse = this.#isFrameOneIndexed ? this.#currentAssetFrame + 1 : this.#currentAssetFrame;
            
            let paddedIndex = String(frameIndexToUse);
            if (this.#assetPrefix.includes('skeleton-animation_')) {
                paddedIndex = paddedIndex.padStart(2, '0');
            } else if (this.#assetPrefix.includes('man')) {
                paddedIndex = paddedIndex.padStart(3, '0');
            } else if (this.#assetPrefix.includes('frame-')) {
                // No extra padding needed
            }
            
            const frameUrl = `${this.#assetPrefix}${paddedIndex}.png`;
            try {
                this.#birdImageDOM.src = frameUrl; 
            } catch (e) {
                console.error("[Bird.js Debug]: Error setting animated sprite <img> src:", e);
            }
        } else {
            console.warn("[Bird.js Debug]: animateSprite called but bird is not configured for animated asset or missing prefix/count.");
        }
    }

    /**
     * Updates the bird's vertical position and rotation based on gravity and vertical speed.
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
        this.applyPositionAndRotation();
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
        this.applyPositionAndRotation();
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
     */
    getBirdPos() {
        return {
            x: this.#birdPosX,
            y: this.#birdPosY,
        };
    }

    /**
     * Gets the bird's current Y position.
     */
    getPosY() {
        return this.#birdPosY;
    }

    /**
     * Returns whether the current bird asset is an animated sprite sheet.
     */
    getIsAnimatedAsset() {
        return this.#isAnimatedAsset;
    }

    /**
     * Returns the bird's DOM element for collision detection.
     */
    getBirdDOM() {
        return this.#birdDOM;
    }
}