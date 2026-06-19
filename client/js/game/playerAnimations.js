function updatePlayerAnimation(avatar, state, time) {
  if (!avatar?.userData?.parts) return;
  const { parts } = avatar.userData;
  const t = time * 0.001;

  if (!state.alive) {
    avatar.userData.deathProgress = Math.min(1, (avatar.userData.deathProgress || 0) + 0.03);
    const p = avatar.userData.deathProgress;
    avatar.rotation.x = p * 1.4;
    avatar.position.y = (state.y ?? 0) - p * 0.5;
    avatar.traverse((c) => {
      if (c.isMesh && c.material && c.name !== 'outline') {
        c.material.transparent = true;
        c.material.opacity = Math.max(0, 1 - p);
      }
    });
    return;
  }

  avatar.rotation.x = 0;
  avatar.traverse((c) => {
    if (c.isMesh && c.material && c.name !== 'outline') {
      c.material.opacity = 1;
      c.material.transparent = c.material.transparent && c.material.map;
    }
  });

  if (avatar.userData.shootTimer > 0) {
    avatar.userData.shootTimer -= 1;
    if (parts.rifle) parts.rifle.rotation.x = -0.35;
  } else if (parts.rifle) {
    parts.rifle.rotation.x = -0.2;
  }

  if (state.jumping) {
    if (parts.legL) parts.legL.rotation.x = 0.55;
    if (parts.legR) parts.legR.rotation.x = -0.45;
    if (parts.armL) parts.armL.rotation.x = -0.3;
    if (parts.armR) parts.armR.rotation.x = 0.4;
    return;
  }

  if (state.moving) {
    const swing = Math.sin(t * 10) * 0.5;
    const bob = Math.abs(Math.sin(t * 10)) * 0.04;
    if (parts.legL) parts.legL.rotation.x = swing;
    if (parts.legR) parts.legR.rotation.x = -swing;
    if (parts.armL) parts.armL.rotation.x = -swing * 0.4;
    if (parts.armR) parts.armR.rotation.x = swing * 0.35;
    if (parts.torso) parts.torso.position.y = 1.05 + bob;
  } else {
    if (parts.legL) parts.legL.rotation.x = 0;
    if (parts.legR) parts.legR.rotation.x = 0;
    if (parts.armL) parts.armL.rotation.x = 0;
    if (parts.armR) parts.armR.rotation.x = 0;
    if (parts.torso) parts.torso.position.y = 1.05;
  }
}

function triggerPlayerShoot(avatar) {
  if (avatar) avatar.userData.shootTimer = 8;
}
