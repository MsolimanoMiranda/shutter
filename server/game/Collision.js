const { MAP_WALLS, PLAYER_RADIUS } = require('./MapData');

function circleIntersectsWall(x, z, radius, wall) {
  const hw = wall.w / 2;
  const hd = wall.d / 2;
  const closestX = Math.max(wall.x - hw, Math.min(x, wall.x + hw));
  const closestZ = Math.max(wall.z - hd, Math.min(z, wall.z + hd));
  const dx = x - closestX;
  const dz = z - closestZ;
  return dx * dx + dz * dz < radius * radius;
}

function collides(x, z, radius = PLAYER_RADIUS) {
  return MAP_WALLS.some((wall) => circleIntersectsWall(x, z, radius, wall));
}

function pushOutOfWalls(x, z, radius = PLAYER_RADIUS) {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 4; pass++) {
    for (const wall of MAP_WALLS) {
      const hw = wall.w / 2;
      const hd = wall.d / 2;
      const closestX = Math.max(wall.x - hw, Math.min(px, wall.x + hw));
      const closestZ = Math.max(wall.z - hd, Math.min(pz, wall.z + hd));
      const dx = px - closestX;
      const dz = pz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist + 0.01;
        px += (dx / dist) * push;
        pz += (dz / dist) * push;
      }
    }
  }
  return { x: px, z: pz };
}

function moveWithCollision(x, z, dx, dz, radius = PLAYER_RADIUS) {
  let newX = x + dx;
  let newZ = z + dz;

  if (collides(newX, newZ, radius)) {
    newX = x + dx;
    newZ = z;
    if (collides(newX, newZ, radius)) {
      newX = x;
      newZ = z + dz;
      if (collides(newX, newZ, radius)) {
        return { x, z };
      }
    }
  }

  return pushOutOfWalls(newX, newZ, radius);
}

function distanceToPoint(x, z, px, pz) {
  return Math.hypot(x - px, z - pz);
}

module.exports = { collides, moveWithCollision, distanceToPoint, PLAYER_RADIUS };
