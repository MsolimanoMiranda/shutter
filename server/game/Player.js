const { v4: uuidv4 } = require('uuid');
const { WEAPONS, SPAWN_POINTS } = require('../config');

function createPlayer(id, name) {
  return {
    id,
    name: name.slice(0, 16),
    team: null,
    x: 0,
    y: 1.6,
    z: 0,
    rotY: 0,
    rotX: 0,
    health: 100,
    armor: 0,
    hasHelmet: false,
    alive: true,
    kills: 0,
    deaths: 0,
    money: 800,
    weapon: null,
    secondary: null,
    ammo: 0,
    reserve: 0,
    lastShot: 0,
    lastMoveTime: 0,
    velY: 0,
    connected: true,
    hasBomb: false,
    hasDefuseKit: false,
    planting: false,
    defusing: false,
  };
}

function getDefaultWeapon(team) {
  return team === 'terrorist' ? 'glock' : 'usp';
}

function equipDefaultLoadout(player) {
  const primary = getDefaultWeapon(player.team);
  player.weapon = primary;
  player.secondary = primary;
  const w = WEAPONS[primary];
  player.ammo = w.magSize;
  player.reserve = w.reserve;
}

function spawnPlayer(player, index) {
  const spawns = SPAWN_POINTS[player.team] || SPAWN_POINTS.terrorist;
  const spawn = spawns[index % spawns.length];
  player.x = spawn.x;
  player.y = spawn.y;
  player.z = spawn.z;
  player.rotY = spawn.rotY;
  player.rotX = 0;
  player.velY = 0;
  player.health = 100;
  player.alive = true;
  player.planting = false;
  player.defusing = false;
  player.hasBomb = false;
  equipDefaultLoadout(player);
}

function serializePlayer(player) {
  return {
    id: player.id,
    name: player.name,
    team: player.team,
    x: player.x,
    y: player.y,
    z: player.z,
    rotY: player.rotY,
    rotX: player.rotX,
    health: player.health,
    armor: player.armor,
    alive: player.alive,
    kills: player.kills,
    deaths: player.deaths,
    money: player.money,
    weapon: player.weapon,
    ammo: player.ammo,
    reserve: player.reserve,
    hasBomb: player.hasBomb,
    hasDefuseKit: player.hasDefuseKit,
    planting: player.planting,
    defusing: player.defusing,
  };
}

module.exports = { createPlayer, equipDefaultLoadout, spawnPlayer, serializePlayer, getDefaultWeapon };
