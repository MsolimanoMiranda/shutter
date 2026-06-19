const HealthPickups = {
  meshes: new Map(),
  group: null,

  init(scene) {
    this.group = new THREE.Group();
    this.group.name = 'healthPickups';
    scene.add(this.group);

    HEALTH_PICKUP_SPAWNS.forEach((spawn, id) => {
      const mesh = this._createMesh(id);
      mesh.position.set(spawn.x, 1.15, spawn.z);
      mesh.userData.baseY = 1.15;
      mesh.userData.id = id;
      this.meshes.set(id, mesh);
      this.group.add(mesh);
    });
  },

  _createMesh(id) {
    const group = new THREE.Group();

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0x44ff88,
        transparent: true,
        opacity: 0.25,
      })
    );
    group.add(glow);

    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x22cc66,
      emissiveIntensity: 0.35,
      roughness: 0.4,
    });
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.14), boxMat);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), boxMat);
    crossH.position.y = 0.05;
    crossV.position.y = 0.05;
    group.add(crossH, crossV);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.12, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a4a2e, roughness: 0.7 })
    );
    base.position.y = -0.2;
    group.add(base);

    const light = new THREE.PointLight(0x44ff88, 0.6, 4);
    light.position.y = 0.3;
    group.add(light);

    group.userData.glow = glow;
    group.userData.light = light;
    group.userData.phase = id * 1.7;
    return group;
  },

  sync(pickups) {
    if (!pickups) return;
    pickups.forEach((p) => {
      const mesh = this.meshes.get(p.id);
      if (mesh) mesh.visible = !!p.active;
    });
  },

  animate(time) {
    const t = time * 0.001;
    this.meshes.forEach((mesh) => {
      if (!mesh.visible) return;
      const phase = mesh.userData.phase;
      mesh.position.y = mesh.userData.baseY + Math.sin(t * 2.2 + phase) * 0.18;
      mesh.rotation.y = t * 1.4 + phase;
      const pulse = 0.22 + Math.sin(t * 4 + phase) * 0.08;
      if (mesh.userData.glow) mesh.userData.glow.material.opacity = pulse;
      if (mesh.userData.light) mesh.userData.light.intensity = 0.45 + Math.sin(t * 4 + phase) * 0.25;
    });
  },
};
