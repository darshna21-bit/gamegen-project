// Animation names
const BIRD_DOWN_FLAP = "bird-downflap";
const BIRD_MID_FLAP = "bird-midflap";
const BIRD_UP_FLAP = "bird-upflap";

export class Bird {
  // DOM
  #birdDOM;
  // Constants
  #gravity;
  #lift;
  #jumpHeight;
  #maxHeight;
  #maxRotation;
  // Bird State
  #birdPosX;
  #birdPosY;
  #vertSpeed;
  #rotation;

  // Sounds
  #flySound;
  #diveSound;

  // Bird Flap Animation
  #flapAnimation = [BIRD_DOWN_FLAP, BIRD_MID_FLAP, BIRD_UP_FLAP, BIRD_MID_FLAP];
  #currentFlap = 0;
  #prevFlap = 0;

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
    // DOM
    this.#birdDOM = birdDOM;
    // Bird State
    this.#birdPosX = birdStartX;
    this.#birdPosY = birdStartY;
    this.#vertSpeed = 0;
    this.#rotation = 0;
    // Constants
    this.#gravity = gravity;
    this.#lift = lift;
    this.#jumpHeight = jumpHeight;
    this.#maxHeight = maxHeight;
    this.#maxRotation = maxRotation;
    this.#birdDOM.style.bottom = this.#birdPosY + "px";
    this.#birdDOM.style.left = this.#birdPosX + "px";
    this.#birdDOM.style.transform = `rotate(${this.#rotation}deg)`;
    // Flap animation
    this.#birdDOM.classList.add(this.#flapAnimation[this.#currentFlap]);
    // Sounds
    this.#flySound = flySound;
  }
  setGravity(newGravity) {
  this.#gravity = newGravity;
  }
  setImage(imageDataUrl) {
    // The bird's appearance is controlled by CSS classes.
    // We target the main '.bird' element. By setting its
    // 'backgroundImage' style directly, we override the CSS file rule.
    if (this.#birdDOM) {
      this.#birdDOM.style.backgroundImage = `url(${imageDataUrl})`;
    }
  }
  // Reset Bird Position
  reset(startX, startY) {
    this.#birdPosX = startX;
    this.#birdPosY = startY;
    this.#vertSpeed = 0;
    this.#rotation = 0;
    this.#birdDOM.style.bottom = this.#birdPosY + "px";
    this.#birdDOM.style.left = this.#birdPosX + "px";
    this.#birdDOM.style.transform = `rotate(${this.#rotation}deg)`;
  }

  // Flap animation
  flap() {
    this.#prevFlap = this.#currentFlap;
    this.#currentFlap = (this.#currentFlap + 1) % this.#flapAnimation.length;
    this.#birdDOM.classList.remove(this.#flapAnimation[this.#prevFlap]);
    this.#birdDOM.classList.add(this.#flapAnimation[this.#currentFlap]);
  }

  // Update Bird Position
  update(lastTime) {
    // Calculate bird velocity
    this.#vertSpeed = Number(
      (
        this.#vertSpeed +
        (this.#gravity + (this.#gravity * lastTime) / 1000)
      ).toFixed(2) // Add gravity and acceleration to bird falling
    );
    // Apply bird velocity to bird position
    this.#birdPosY -= this.#vertSpeed;
    // Check for ground collision
    if (this.#birdPosY <= 0) {
      this.#birdPosY = 0; // Set bird to ground
    }

    // Rotate bird based on vertSpeed
    this.#rotation = Math.min(this.#maxRotation, this.#vertSpeed * 7);
    // Render new bird position and rotation
    this.#birdDOM.style.bottom = this.#birdPosY + "px";
    this.#birdDOM.style.transform = `rotate(${this.#rotation}deg)`;
  }

  // Apply Jump to Bird
  jump() {
    this.#vertSpeed = this.#lift;
    this.#birdPosY += this.#jumpHeight;
    if (this.#birdPosY >= this.#maxHeight) {
      this.#birdPosY = this.#maxHeight;
    }
    this.#birdDOM.style.bottom = this.#birdPosY + "px";
    this.#flySound.currentTime = 0;
    this.#flySound.play();
  }

  // Set Bird Speed to 0 on collision
  setZeroSpeed() {
    this.#vertSpeed = 2;
  }

  // Get Bird Position
  getBirdPos() {
    return {
      x: this.#birdPosX,
      y: this.#birdPosY,
    };
  }

  // Get Bird Position Y
  getPosY() {
    return this.#birdPosY;
  }
}
