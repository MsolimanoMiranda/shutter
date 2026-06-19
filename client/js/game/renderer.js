class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc9a86c);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;

    this.playerMeshes = new Map();
    this.remoteTargets = new Map();
    this.playerMeta = new Map();
    this.localId = null;
    this.bombMesh = null;
    this.viewmodel = null;
    this.playerTeam = 'terrorist';
    this.clock = new THREE.Clock();
    this.isMoving = false;
    this.isJumping = false;
    this.recoilPitch = 0;

    setupLighting(this.scene);
    buildMap(this.scene);
    this._createBombMesh();

    this.camera.position.set(0, 1.6, 0);
    this.scene.add(this.camera);
    this.viewmodel = createViewmodel(this.camera, 'terrorist');

    window.addEventListener('resize', () => this.onResize());
  }

  setTeam(team) {
    if (!team || this.playerTeam === team) return;
    this.playerTeam = team;
    this.viewmodel = createViewmodel(this.camera, team);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setLocalPlayer(id) {
    this.localId = id;
  }

  setMoving(moving) { this.isMoving = moving; }
  setJumping(jumping) { this.isJumping = jumping; }

  triggerShootFX(rotY, rotX) {
    this.recoilPitch = 0.04;
    triggerShootEffects(this, this.camera, this.viewmodel, rotY, rotX);
  }

  updateLocalCamera(x, y, z, rotY, rotX) {
    const pitch = rotX + this.recoilPitch;
    this.camera.position.set(x, y, z);
    const lookX = x + Math.sin(rotY) * Math.cos(pitch);
    const lookY = y + Math.sin(pitch);
    const lookZ = z + Math.cos(rotY) * Math.cos(pitch);
    this.camera.lookAt(lookX, lookY, lookZ);
    this.recoilPitch *= 0.7;
    if (this.recoilPitch < 0.001) this.recoilPitch = 0;
  }

  syncPlayers(players, localId) {
    const seen = new Set();
    const now = performance.now();

    players.forEach((p) => {
      seen.add(p.id);
      let mesh = this.playerMeshes.get(p.id);
      const meta = this.playerMeta.get(p.id) || { prevX: p.x, prevZ: p.z, lastMove: now };

      if (!mesh || mesh.userData.team !== p.team) {
        if (mesh) {
          this.scene.remove(mesh);
          this.playerMeshes.delete(p.id);
        }
        mesh = createPlayerAvatar(p.team);
        mesh.userData.team = p.team;
        this.playerMeshes.set(p.id, mesh);
        this.scene.add(mesh);
        meta.deathProgress = 0;
      }

      const dist = Math.hypot(p.x - meta.prevX, p.z - meta.prevZ);
      const moving = dist > 0.08;
      const jumping = p.y > 1.65;
      if (moving) meta.lastMove = now;
      meta.prevX = p.x;
      meta.prevZ = p.z;
      meta.moving = moving || (now - meta.lastMove < 200);
      meta.jumping = jumping;
      meta.alive = p.alive;
      meta.name = p.name;
      meta.health = p.health;
      meta.hasBomb = p.hasBomb;
      meta.rotY = p.rotY;
      this.playerMeta.set(p.id, meta);

      updatePlayerNameTag(mesh.userData.nameTag, {
        name: p.name,
        health: p.health,
        team: p.team,
        hasBomb: p.hasBomb,
      });
      if (mesh.userData.bombIcon) {
        mesh.userData.bombIcon.visible = !!p.hasBomb && p.alive;
      }

      if (p.id !== localId) {
        const groundOffset = Math.max(0, p.y - 1.6);
        mesh.position.set(p.x, groundOffset, p.z);
        mesh.rotation.y = p.rotY;
        if (p.alive) {
          mesh.userData.deathProgress = 0;
          mesh.visible = true;
        } else if ((mesh.userData.deathProgress || 0) >= 1) {
          mesh.visible = false;
        }
        this.remoteTargets.set(p.id, {
          x: p.x, y: groundOffset, z: p.z, rotY: p.rotY,
          alive: p.alive, moving: meta.moving, jumping,
        });
      } else {
        mesh.visible = false;
      }
    });

    for (const [id, mesh] of this.playerMeshes) {
      if (!seen.has(id)) {
        this.scene.remove(mesh);
        this.playerMeshes.delete(id);
        this.remoteTargets.delete(id);
        this.playerMeta.delete(id);
      }
    }
  }

  updateRemotePlayer(data) {
    const meta = this.playerMeta.get(data.id) || { prevX: data.x, prevZ: data.z, lastMove: performance.now() };
    const dist = Math.hypot(data.x - meta.prevX, data.z - meta.prevZ);
    if (dist > 0.05) meta.lastMove = performance.now();
    meta.prevX = data.x;
    meta.prevZ = data.z;
    meta.moving = dist > 0.05;
    meta.jumping = data.y > 1.65;
    this.playerMeta.set(data.id, meta);

    const groundOffset = Math.max(0, data.y - 1.6);
    this.remoteTargets.set(data.id, {
      x: data.x, y: groundOffset, z: data.z, rotY: data.rotY,
      alive: true, moving: meta.moving, jumping: meta.jumping,
    });
  }

  onPlayerShot(shooterId) {
    const mesh = this.playerMeshes.get(shooterId);
    triggerPlayerShoot(mesh);
  }

  _interpolateRemotes(dt) {
    const lerp = Math.min(dt * 12, 1);
    const time = this.clock.elapsedTime * 1000;

    for (const [id, target] of this.remoteTargets) {
      const mesh = this.playerMeshes.get(id);
      if (!mesh || id === this.localId) continue;

      mesh.position.x += (target.x - mesh.position.x) * lerp;
      mesh.position.y += ((target.y ?? 0) - mesh.position.y) * lerp;
      mesh.position.z += (target.z - mesh.position.z) * lerp;
      mesh.rotation.y += (target.rotY - mesh.rotation.y) * lerp;

      updatePlayerAnimation(mesh, {
        alive: target.alive !== false,
        moving: target.moving,
        jumping: target.jumping,
        y: mesh.position.y,
      }, time);
    }
  }

  syncBomb(bomb) {
    if (!this.bombMesh) return;
    if (bomb.state === 'planted') {
      this.bombMesh.visible = true;
      this.bombMesh.position.set(bomb.x, 0.35, bomb.z);
      this.bombMesh.children[0].material.emissiveIntensity = 0.4 + Math.sin(Date.now() * 0.005) * 0.3;
    } else {
      this.bombMesh.visible = false;
    }
  }

  _createBombMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x333333, roughness: 0.5, metalness: 0.6,
      emissive: 0xff4400, emissiveIntensity: 0.3,
    });
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.7), bodyMat));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2200 }));
    screen.position.set(0, 0.1, 0.36);
    group.add(screen);
    this.bombMesh = group;
    this.bombMesh.visible = false;
    this.scene.add(this.bombMesh);
  }

  render() {
    const dt = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime * 1000;
    this._interpolateRemotes(dt);
    animateDust(this.scene, elapsed);
    updateViewmodel(this.viewmodel, elapsed, this.isMoving, this.isJumping);
    applyRecoil(this.viewmodel);
    DamageNumbers.update(this.camera, dt);
    this.renderer.render(this.scene, this.camera);
  }
}
