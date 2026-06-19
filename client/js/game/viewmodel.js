function createViewmodel(camera, team = 'terrorist') {
  if (camera.getObjectByName('viewmodel')) {
    camera.remove(camera.getObjectByName('viewmodel'));
  }

  const group = new THREE.Group();
  group.name = 'viewmodel';
  group.userData.basePos = { x: 0.18, y: -0.18, z: -0.38 };
  group.userData.team = team;

  if (team === 'terrorist') {
    _buildAK47(group);
  } else {
    _buildM4A1(group);
  }

  group.position.set(group.userData.basePos.x, group.userData.basePos.y, group.userData.basePos.z);
  camera.add(group);
  return group;
}

function _buildAK47(group) {
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.35, metalness: 0.75 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.82, metalness: 0.05 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.5, emissive: 0x331100, emissiveIntensity: 0.08 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.9 });

  // Mano izquierda en el guardamanos
  const handL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.14), glove);
  handL.position.set(-0.02, -0.02, -0.18);
  group.add(handL);

  // Guardamanos de madera
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.28), wood);
  handguard.position.set(0, 0.01, -0.2);
  group.add(handguard);

  // Cuerpo / receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.32), metal);
  receiver.position.set(0, 0.04, -0.02);
  group.add(receiver);

  // Detalle naranja T
  const accent = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08), orange);
  accent.position.set(0.05, 0.08, 0.02);
  group.add(accent);

  // Cañón
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.38, 10), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.06, -0.42);
  group.add(barrel);

  // Freno de boca
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.028, 0.05, 8), metal);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.06, -0.62);
  group.add(muzzle);

  // Cargador curvo AK
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.08), metal);
  mag.position.set(0, -0.1, 0.02);
  mag.rotation.x = 0.15;
  group.add(mag);

  // Culata de madera
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.24), wood);
  stock.position.set(0, 0.02, 0.2);
  group.add(stock);

  // Empuñadura
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.07), wood);
  grip.position.set(0, -0.1, 0.04);
  grip.rotation.x = 0.2;
  group.add(grip);

  // Mano derecha en el grip
  const handR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.1), glove);
  handR.position.set(0, -0.14, 0.06);
  group.add(handR);

  // Miras
  const sightRear = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.04), metal);
  sightRear.position.set(0, 0.13, 0.06);
  group.add(sightRear);
  const sightFront = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.015), metal);
  sightFront.position.set(0, 0.1, -0.32);
  group.add(sightFront);

  group.userData.muzzle = muzzle;
}

function _buildM4A1(group) {
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.3, metalness: 0.8 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 });
  const green = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, roughness: 0.55, emissive: 0x112200, emissiveIntensity: 0.06 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.88 });

  const handL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.14), glove);
  handL.position.set(-0.02, -0.01, -0.2);
  group.add(handL);

  // Handguard rails
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.085, 0.3), black);
  rail.position.set(0, 0.02, -0.2);
  group.add(rail);
  for (let i = 0; i < 5; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.012, 0.02), metal);
    slot.position.set(0, 0.06, -0.1 - i * 0.05);
    group.add(slot);
  }

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.1, 0.28), metal);
  receiver.position.set(0, 0.04, -0.02);
  group.add(receiver);

  const accent = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.06), green);
  accent.position.set(-0.04, 0.08, 0.04);
  group.add(accent);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.4, 10), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.055, -0.44);
  group.add(barrel);

  const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.12, 10), black);
  suppressor.rotation.x = Math.PI / 2;
  suppressor.position.set(0, 0.055, -0.66);
  group.add(suppressor);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.07), black);
  mag.position.set(0, -0.1, 0.02);
  group.add(mag);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.09, 0.2), black);
  stock.position.set(0, 0.01, 0.2);
  group.add(stock);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.065), black);
  grip.position.set(0, -0.1, 0.05);
  grip.rotation.x = 0.18;
  group.add(grip);

  const handR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.1), glove);
  handR.position.set(0, -0.14, 0.07);
  group.add(handR);

  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.1), metal);
  scope.position.set(0, 0.12, -0.05);
  group.add(scope);

  group.userData.muzzle = suppressor;
}

function updateViewmodel(viewmodel, time, isMoving, isJumping) {
  if (!viewmodel) return;
  const base = viewmodel.userData.basePos;

  let bob = 0;
  let sway = 0;
  let jumpOff = 0;

  if (isJumping) {
    jumpOff = -0.04;
    viewmodel.rotation.x = 0.08;
  } else {
    viewmodel.rotation.x = 0;
    if (isMoving) {
      bob = Math.sin(time * 0.012) * 0.008;
      sway = Math.sin(time * 0.01) * 0.002;
      viewmodel.rotation.z = sway * 0.4;
    } else {
      viewmodel.rotation.z = 0;
    }
  }

  viewmodel.position.set(base.x + sway, base.y + bob + jumpOff, base.z);
}
