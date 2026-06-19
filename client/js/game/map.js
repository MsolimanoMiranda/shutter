const MAP_FLOOR_COLOR = 0x9a7d55;
const MAP_SKY_TOP = 0x87a8c4;
const MAP_SKY_BOTTOM = 0xc9a86c;
const MAP_FOG_COLOR = 0xc9a070;

function buildMap(scene) {
  const sandTex = createSandTexture();
  sandTex.repeat.set(12, 12);

  const groundGeo = new THREE.PlaneGeometry(90, 90, 32, 32);
  const groundMat = new THREE.MeshLambertMaterial({
    map: sandTex,
    color: MAP_FLOOR_COLOR,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const stoneTex = createStoneTexture();
  stoneTex.repeat.set(2, 2);
  const crateTex = createCrateTexture();

  const wallMat = new THREE.MeshLambertMaterial({
    map: stoneTex,
    color: 0xc4a882,
  });
  const crateMat = new THREE.MeshLambertMaterial({
    map: crateTex,
    color: 0x8b6535,
  });

  MAP_WALLS.forEach((w) => {
    const isCrate = w.h <= 3 && w.w <= 6;
    const geo = new THREE.BoxGeometry(w.w, w.h, w.d);
    const mesh = new THREE.Mesh(geo, isCrate ? crateMat : wallMat);
    mesh.position.set(w.x, w.h / 2, w.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  _buildSkyDome(scene);
  _buildArch(scene, -15, -25);
  _buildArch(scene, 15, 25);
  _buildPillar(scene, -10, -10);
  _buildPillar(scene, 10, 10);
  _buildDustParticles(scene);

  addSiteMarker(scene, BOMB_SITES.A.x, BOMB_SITES.A.z, 'A', 0xFF6B00);
  addSiteMarker(scene, BOMB_SITES.B.x, BOMB_SITES.B.z, 'B', 0xA8B86A);
}

function _buildSkyDome(scene) {
  const skyGeo = new THREE.SphereGeometry(120, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(MAP_SKY_TOP) },
      bottomColor: { value: new THREE.Color(MAP_SKY_BOTTOM) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y * 0.5 + 0.5;
        gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
}

function _buildArch(scene, x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xa89070, roughness: 0.8, metalness: 0.05 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(1.5, 8, 1.5), mat);
  left.position.set(x - 4, 4, z);
  left.castShadow = true;
  const right = new THREE.Mesh(new THREE.BoxGeometry(1.5, 8, 1.5), mat);
  right.position.set(x + 4, 4, z);
  right.castShadow = true;
  const top = new THREE.Mesh(new THREE.BoxGeometry(9.5, 1.5, 1.5), mat);
  top.position.set(x, 8, z);
  top.castShadow = true;
  scene.add(left, right, top);
}

function _buildPillar(scene, x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a7a60, roughness: 0.75 });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 10, 8), mat);
  pillar.position.set(x, 5, z);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  scene.add(pillar);
}

function _buildDustParticles(scene) {
  const count = 200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = 1 + Math.random() * 12;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffeedd,
    size: 0.15,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const dust = new THREE.Points(geo, mat);
  dust.name = 'dust';
  scene.add(dust);
}

function addSiteMarker(scene, x, z, label, color) {
  const ringGeo = new THREE.RingGeometry(4.5, 5, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.45 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.06, z);
  scene.add(ring);

  const glowGeo = new THREE.CircleGeometry(4.5, 48);
  const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(x, 0.05, z);
  scene.add(glow);
}

function setupLighting(scene) {
  scene.fog = new THREE.Fog(MAP_FOG_COLOR, 40, 120);

  const hemi = new THREE.HemisphereLight(0x99bbdd, 0xc9a070, 0.85);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffeedd, 0.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffe0b0, 1.8);
  sun.position.set(40, 70, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -50;
  sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x99aacc, 0.6);
  fill.position.set(-30, 40, -20);
  scene.add(fill);

  const warm = new THREE.PointLight(0xffcc88, 1.0, 50);
  warm.position.set(0, 8, 0);
  scene.add(warm);
}

function animateDust(scene, time) {
  const dust = scene.getObjectByName('dust');
  if (!dust) return;
  const pos = dust.geometry.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i + 1] += Math.sin(time * 0.001 + i) * 0.002;
  }
  dust.geometry.attributes.position.needsUpdate = true;
}
