class FPSControls {
  constructor(canvas, onMove, onShoot) {
    this.canvas = canvas;
    this.onMove = onMove;
    this.onShoot = onShoot;
    this.enabled = false;

    this.keys = {};
    this.rotY = 0;
    this.rotX = 0;
    this.posX = 0;
    this.posY = CONFIG.GROUND_Y || 1.6;
    this.posZ = 0;
    this.velY = 0;
    this.groundY = CONFIG.GROUND_Y || 1.6;
    this.onGround = true;

    this.lastTime = performance.now();
    this.lastNetSend = 0;
    this.isMoving = false;
    this.MOVE_SPEED = CONFIG.MOVEMENT_SPEED || 13;
    this.JUMP_FORCE = CONFIG.JUMP_FORCE || 6.8;
    this.GRAVITY = CONFIG.GRAVITY || 13.5;
    this.AIR_CONTROL = CONFIG.AIR_CONTROL || 0.75;
    this.NET_SEND_MS = 33;
    this.jumpCooldown = 0;

    this._bindEvents();
    this._loop();
  }

  _bindEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea')) return;
      this.keys[e.code] = true;
      if (e.code === 'KeyR') gameSocket.reload();
      if (e.code === 'Digit4') gameSocket.plant(true);
      if (e.code === 'Digit5') gameSocket.defuse(true);
      if (e.code === 'Space') {
        e.preventDefault();
        this._tryJump();
      }
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Digit4') gameSocket.plant(false);
      if (e.code === 'Digit5') gameSocket.defuse(false);
    });

    this.canvas.addEventListener('click', () => {
      if (this.enabled) this.canvas.requestPointerLock();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.enabled || document.pointerLockElement !== this.canvas) return;
      this.rotY -= e.movementX * 0.002;
      this.rotX -= e.movementY * 0.002;
      this.rotX = Math.max(-1.2, Math.min(1.2, this.rotX));
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.enabled || e.button !== 0) return;
      if (this.onShoot) this.onShoot(this.rotY, this.rotX);
      gameSocket.shoot();
    });
  }

  _tryJump() {
    if (!this.enabled || !this.onGround || this.jumpCooldown > 0) return;
    this.velY = this.JUMP_FORCE;
    this.onGround = false;
    this.jumpCooldown = 0.25;
    gameSocket.jump();
  }

  enable() {
    this.enabled = true;
    this.canvas.requestPointerLock();
  }

  disable() {
    this.enabled = false;
    this.isMoving = false;
    document.exitPointerLock();
  }

  setPosition(x, y, z, rotY) {
    this.posX = x;
    this.posY = y;
    this.posZ = z;
    this.rotY = rotY;
    this.onGround = y <= this.groundY + 0.05;
    if (this.onGround) this.velY = 0;
  }

  _applyGravity(dt) {
    if (!this.onGround || this.posY > this.groundY) {
      this.velY -= this.GRAVITY * dt;
      this.posY += this.velY * dt;
      if (this.posY <= this.groundY) {
        this.posY = this.groundY;
        this.velY = 0;
        this.onGround = true;
      }
    }
  }

  _applyLocalMove(dt, moveX, moveZ) {
    const dx = Math.sin(this.rotY) * moveZ * this.MOVE_SPEED * dt + Math.cos(this.rotY) * moveX * this.MOVE_SPEED * dt;
    const dz = Math.cos(this.rotY) * moveZ * this.MOVE_SPEED * dt - Math.sin(this.rotY) * moveX * this.MOVE_SPEED * dt;
    const pos = moveWithCollision(this.posX, this.posZ, dx, dz);
    this.posX = pos.x;
    this.posZ = pos.z;
  }

  _loop() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.enabled) {
      if (this.jumpCooldown > 0) this.jumpCooldown -= dt;
      this._applyGravity(dt);

      let moveX = 0;
      let moveZ = 0;
      if (this.keys['KeyW']) moveZ += 1;
      if (this.keys['KeyS']) moveZ -= 1;
      if (this.keys['KeyA']) moveX += 1;
      if (this.keys['KeyD']) moveX -= 1;

      if (moveX !== 0 || moveZ !== 0) {
        const len = Math.hypot(moveX, moveZ);
        moveX /= len;
        moveZ /= len;

        const control = this.onGround ? 1 : this.AIR_CONTROL;
        this._applyLocalMove(dt, moveX * control, moveZ * control);
        this.isMoving = true;

        if (now - this.lastNetSend >= this.NET_SEND_MS) {
          this.lastNetSend = now;
          this.onMove({ moveX, moveZ, rotY: this.rotY, rotX: this.rotX });
        }
      } else {
        this.isMoving = false;
      }
    }

    requestAnimationFrame(() => this._loop());
  }

  getCamera() {
    return { x: this.posX, y: this.posY, z: this.posZ, rotY: this.rotY, rotX: this.rotX };
  }

  isCurrentlyMoving() {
    return this.isMoving;
  }

  isJumping() {
    return !this.onGround && this.posY > this.groundY + 0.02;
  }
}
