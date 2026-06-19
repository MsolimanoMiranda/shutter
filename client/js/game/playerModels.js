function createPlayerAvatar(team) {
  const avatar = team === 'terrorist' ? _buildTerroristBody() : _buildCTBody();
  _addTeamOutline(avatar, team === 'terrorist' ? 0xff6b00 : 0xa8b86a);
  const nameTag = _createNameTagSprite();
  nameTag.name = 'nameTag';
  avatar.add(nameTag);

  const bombIcon = _createBombIconSprite();
  bombIcon.name = 'bombIcon';
  bombIcon.visible = false;
  avatar.add(bombIcon);

  avatar.userData.nameTag = nameTag;
  avatar.userData.bombIcon = bombIcon;
  avatar.userData.team = team;
  avatar.userData.deathProgress = 0;
  avatar.userData.shootTimer = 0;

  return avatar;
}

function _addTeamOutline(group, color) {
  const outlineMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.35,
  });
  group.traverse((child) => {
    if (!child.isMesh || !child.geometry || child.name === 'outline') return;
    const outline = new THREE.Mesh(child.geometry, outlineMat);
    outline.name = 'outline';
    outline.scale.multiplyScalar(1.08);
    outline.position.copy(child.position);
    outline.rotation.copy(child.rotation);
    child.parent.add(outline);
  });
}

function _createNameTagSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.position.set(0, 2.25, 0);
  sprite.scale.set(1.8, 0.45, 1);
  sprite.renderOrder = 999;
  sprite.userData.canvas = canvas;
  sprite.userData.texture = tex;
  return sprite;
}

function updatePlayerNameTag(sprite, { name, health, team, hasBomb }) {
  if (!sprite) return;
  const canvas = sprite.userData.canvas;
  const ctx = canvas.getContext('2d');
  const teamColor = team === 'terrorist' ? '#ff6b00' : '#a8b86a';
  const hp = Math.max(0, Math.round(health ?? 100));

  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(8,8,8,0.82)';
  ctx.strokeStyle = teamColor;
  ctx.lineWidth = 2;
  _roundRect(ctx, 4, 4, 248, 56, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e8e6dc';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  const displayName = (name || 'OPERATOR').slice(0, 14);
  ctx.fillText(displayName, 128, 24);

  const barX = 16;
  const barW = 224;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(barX, 34, barW, 10);
  const hpColor = hp > 60 ? '#a8b86a' : hp > 30 ? '#ff6b00' : '#c0392b';
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, 34, barW * (hp / 100), 10);

  ctx.fillStyle = '#9a9b8f';
  ctx.font = '11px monospace';
  ctx.fillText(`HP ${hp}${hasBomb ? '  [C4]' : ''}`, 128, 56);

  sprite.userData.texture.needsUpdate = true;
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _createBombIconSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff2200';
  ctx.beginPath();
  ctx.arc(32, 32, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('C4', 32, 37);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.position.set(0, 2.55, 0);
  sprite.scale.set(0.35, 0.35, 1);
  sprite.renderOrder = 1000;
  return sprite;
}

function _part(geo, mat, pos, rot, name) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  return mesh;
}

function _buildRifle(team, parts) {
  const rifle = new THREE.Group();
  rifle.name = 'rifle';
  const isT = team === 'terrorist';
  const metal = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.4, metalness: 0.55 });
  const wood = new THREE.MeshStandardMaterial({ color: isT ? 0x5a3818 : 0x2a2a2a, roughness: 0.8 });

  rifle.add(_part(new THREE.BoxGeometry(0.05, 0.07, 0.28), metal, [0, 0, 0], null, 'rifleBody'));
  const barrel = _part(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8), metal, [0, 0.02, -0.22], [Math.PI / 2, 0, 0], 'barrel');
  rifle.add(barrel);
  rifle.position.set(0.22, 1.02, 0.2);
  rifle.rotation.set(-0.2, -0.35, 0);
  parts.rifle = rifle;
  return rifle;
}

function _buildTerroristBody() {
  const group = new THREE.Group();
  group.name = 'avatar-terrorist';
  const parts = {};
  group.userData.parts = parts;

  const jacket = new THREE.MeshStandardMaterial({ color: 0x1a140e, roughness: 0.8 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.93 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.5, emissive: 0x441800, emissiveIntensity: 0.2 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.85 });

  const legL = _part(new THREE.BoxGeometry(0.18, 0.9, 0.22), legMat, [-0.12, 0.45, 0], null, 'legL');
  const legR = _part(new THREE.BoxGeometry(0.18, 0.9, 0.22), legMat, [0.12, 0.45, 0], null, 'legR');
  parts.legL = legL;
  parts.legR = legR;
  group.add(legL, legR);

  group.add(_part(new THREE.BoxGeometry(0.2, 0.12, 0.28), black, [-0.12, 0.06, 0.04], null, 'bootL'));
  group.add(_part(new THREE.BoxGeometry(0.2, 0.12, 0.28), black, [0.12, 0.06, 0.04], null, 'bootR'));

  const torso = _part(new THREE.BoxGeometry(0.5, 0.6, 0.26), jacket, [0, 1.05, 0], null, 'torso');
  parts.torso = torso;
  group.add(torso);

  group.add(_part(new THREE.BoxGeometry(0.52, 0.46, 0.18), new THREE.MeshStandardMaterial({ color: 0x352a18 }), [0, 1.08, 0.06], null, 'rig'));
  group.add(_part(new THREE.BoxGeometry(0.08, 0.06, 0.14), orange, [-0.4, 1.02, 0.02], null, 'band'));
  group.add(_part(new THREE.BoxGeometry(0.12, 0.08, 0.02), orange, [0.18, 1.18, 0.14], null, 'patch'));

  const armL = _part(new THREE.BoxGeometry(0.13, 0.5, 0.13), jacket, [-0.36, 0.95, 0.02], [0, 0, 0.2], 'armL');
  const armR = _part(new THREE.BoxGeometry(0.13, 0.5, 0.13), jacket, [0.36, 0.95, 0.02], [0, 0, -0.15], 'armR');
  parts.armL = armL;
  parts.armR = armR;
  group.add(armL, armR);

  group.add(_part(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshStandardMaterial({ color: 0xc68642 }), [0, 1.55, 0], null, 'head'));
  group.add(_part(new THREE.SphereGeometry(0.195, 12, 12), black, [0, 1.53, 0.01], null, 'mask'));
  group.add(_part(new THREE.SphereGeometry(0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), black, [0, 1.65, -0.03], null, 'hood'));

  group.add(_buildRifle('terrorist', parts));
  return group;
}

function _buildCTBody() {
  const group = new THREE.Group();
  group.name = 'avatar-ct';
  const parts = {};
  group.userData.parts = parts;

  const uniform = new THREE.MeshStandardMaterial({ color: 0x1a2d4a, roughness: 0.7 });
  const vest = new THREE.MeshStandardMaterial({ color: 0x3a5a2e, roughness: 0.62 });
  const black = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.45, metalness: 0.25 });
  const helmet = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.32, metalness: 0.4 });

  const legL = _part(new THREE.BoxGeometry(0.18, 0.9, 0.22), uniform, [-0.12, 0.45, 0], null, 'legL');
  const legR = _part(new THREE.BoxGeometry(0.18, 0.9, 0.22), uniform, [0.12, 0.45, 0], null, 'legR');
  parts.legL = legL;
  parts.legR = legR;
  group.add(legL, legR);

  group.add(_part(new THREE.BoxGeometry(0.2, 0.12, 0.28), black, [-0.12, 0.06, 0.04], null, 'bootL'));
  group.add(_part(new THREE.BoxGeometry(0.2, 0.12, 0.28), black, [0.12, 0.06, 0.04], null, 'bootR'));

  const torso = _part(new THREE.BoxGeometry(0.5, 0.6, 0.26), uniform, [0, 1.05, 0], null, 'torso');
  parts.torso = torso;
  group.add(torso);

  group.add(_part(new THREE.BoxGeometry(0.54, 0.52, 0.24), vest, [0, 1.08, 0.02], null, 'vest'));
  group.add(_part(new THREE.BoxGeometry(0.18, 0.08, 0.02), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7 }), [0, 1.16, 0.14], null, 'badge'));

  const armL = _part(new THREE.BoxGeometry(0.13, 0.5, 0.13), uniform, [-0.36, 0.95, 0.02], null, 'armL');
  const armR = _part(new THREE.BoxGeometry(0.13, 0.5, 0.13), uniform, [0.36, 0.95, 0.02], null, 'armR');
  parts.armL = armL;
  parts.armR = armR;
  group.add(armL, armR);

  group.add(_part(new THREE.SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), helmet, [0, 1.62, -0.02], null, 'helmet'));
  group.add(_part(new THREE.BoxGeometry(0.34, 0.08, 0.04), new THREE.MeshStandardMaterial({ color: 0x55aa88, emissive: 0x113322, emissiveIntensity: 0.25 }), [0, 1.55, 0.18], null, 'visor'));

  group.add(_buildRifle('counter_terrorist', parts));
  return group;
}
