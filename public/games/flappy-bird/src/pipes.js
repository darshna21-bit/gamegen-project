export class Pipe {
  // Constants
  #skyDOM;
  #pipeGap;
  #pipeSpeed;
  #pipeCollisionEndX;
  #pipeCollisionStartX;
  #bottomPipeCollisionY;
  #topPipeCollisionY;
  // Collision Constants
  // Position
  #pipePosX;
  #pipePosY;
  // Pipe Elements
  #bottomPipe;
  #topPipe;
  // Points
  #hasPoint;
  constructor(
    pipePosX,
    pipePosY,
    pipeGap,
    skyDOM,
    pipeSpeed,
    pipeCollisionEndX,
    pipeCollisionStartX,
    bottomPipeCollisionY,
    topPipeCollisionY
  ) {
    // Constants
    this.#skyDOM = skyDOM;
    this.#pipeGap = pipeGap;
    this.#pipeSpeed = pipeSpeed;
    // Position
    this.#pipePosX = pipePosX;
    this.#pipePosY = pipePosY + Math.random() * 200;
    // Collision Constants
    this.#pipeCollisionEndX = pipeCollisionEndX;
    this.#pipeCollisionStartX = pipeCollisionStartX;
    this.#bottomPipeCollisionY = bottomPipeCollisionY;
    this.#topPipeCollisionY = topPipeCollisionY;
    // Points
    this.#hasPoint = false;
  }

  // Update Pipe Position
  update() {
    this.#pipePosX -= this.#pipeSpeed;
    this.#bottomPipe.style.left = this.#pipePosX + "px";
    this.#topPipe.style.left = this.#pipePosX + "px";
  }

  // Delete Pipe
  delete() {
    this.#skyDOM.removeChild(this.#bottomPipe);
    this.#skyDOM.removeChild(this.#topPipe);
  }

  // Check Collision
  checkCollision(birdPosY) {
    // Check if bird is within the bounds of the pipe
    if (
      this.#pipePosX > this.#pipeCollisionEndX &&
      this.#pipePosX < this.#pipeCollisionStartX
    ) {
      // Check Pipe Collision
      if (
        birdPosY < this.#pipePosY + this.#bottomPipeCollisionY ||
        birdPosY > this.#pipePosY + this.#pipeGap + this.#topPipeCollisionY
      ) {
        return true;
      }
    }
    return false;
  }
  // Has Passed and not been assigned a point
  hasPassed() {
    if (this.#pipePosX < this.#pipeCollisionEndX && !this.#hasPoint) {
      this.#hasPoint = true;
      return true;
    }
    return false;
  }
  // Draw Pipe
  draw() {
    // Draw Pipe
    this.#bottomPipe = document.createElement("div");
    this.#bottomPipe.className = "pipe";
    this.#bottomPipe.style.left = this.#pipePosX + "px";
    this.#bottomPipe.style.bottom = this.#pipePosY + "px";
    this.#skyDOM.appendChild(this.#bottomPipe);

    this.#topPipe = document.createElement("div");
    this.#topPipe.className = "topPipe";
    this.#topPipe.style.left = this.#pipePosX + "px";
    this.#topPipe.style.bottom = this.#pipePosY + this.#pipeGap + "px";
    this.#skyDOM.appendChild(this.#topPipe);
  }

  // Get Pipe Position X
  getPosX() {
    return this.#pipePosX;
  }
}
