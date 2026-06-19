const MAX_PLAYERS = 10;
const MAP_NAME = 'DE_DUST2';
const ROUND_TIME = 115;
const BUY_TIME = 15;
const MAX_ROUNDS = 30;
const WIN_SCORE = 16;

const PLANT_TIME = 3;
const DEFUSE_TIME = 10;
const DEFUSE_TIME_KIT = 5;
const BOMB_TIMER = 40;
const DEFUSE_RADIUS = 2.5;
const MAX_CHAT_HISTORY = 50;
const MOVEMENT_SPEED = 13;
const GROUND_Y = 1.6;
const JUMP_FORCE = 6.8;
const GRAVITY = 13.5;
const AIR_CONTROL = 0.75;

const TEAMS = {
  T: 'terrorist',
  CT: 'counter_terrorist',
};

const SPAWN_POINTS = {
  terrorist: [
    { x: -35, y: 1.6, z: 25, rotY: Math.PI },
    { x: -30, y: 1.6, z: 28, rotY: Math.PI },
    { x: -38, y: 1.6, z: 22, rotY: Math.PI },
    { x: -32, y: 1.6, z: 20, rotY: Math.PI },
    { x: -40, y: 1.6, z: 30, rotY: Math.PI },
  ],
  counter_terrorist: [
    { x: 35, y: 1.6, z: -25, rotY: 0 },
    { x: 30, y: 1.6, z: -28, rotY: 0 },
    { x: 38, y: 1.6, z: -22, rotY: 0 },
    { x: 32, y: 1.6, z: -20, rotY: 0 },
    { x: 40, y: 1.6, z: -30, rotY: 0 },
  ],
};

const WEAPONS = {
  glock: { name: 'Glock-18', damage: 25, fireRate: 400, magSize: 20, reserve: 120, price: 0, team: 'terrorist' },
  usp: { name: 'USP-S', damage: 25, fireRate: 400, magSize: 12, reserve: 100, price: 0, team: 'counter_terrorist' },
  ak47: { name: 'AK-47', damage: 36, fireRate: 600, magSize: 30, reserve: 90, price: 2700, team: 'terrorist' },
  m4a1: { name: 'M4A1-S', damage: 33, fireRate: 666, magSize: 30, reserve: 90, price: 2900, team: 'counter_terrorist' },
  deagle: { name: 'Desert Eagle', damage: 53, fireRate: 267, magSize: 7, reserve: 35, price: 700, team: 'both' },
  kevlar: { name: 'Kevlar', price: 650, type: 'equipment' },
  kevlar_helmet: { name: 'Kevlar + Helmet', price: 1000, type: 'equipment' },
  defuse_kit: { name: 'Defuse Kit', price: 400, type: 'equipment', team: 'counter_terrorist' },
};

module.exports = {
  MAX_PLAYERS,
  MAP_NAME,
  ROUND_TIME,
  BUY_TIME,
  MAX_ROUNDS,
  WIN_SCORE,
  PLANT_TIME,
  DEFUSE_TIME,
  DEFUSE_TIME_KIT,
  BOMB_TIMER,
  DEFUSE_RADIUS,
  MAX_CHAT_HISTORY,
  MOVEMENT_SPEED,
  GROUND_Y,
  JUMP_FORCE,
  GRAVITY,
  AIR_CONTROL,
  TEAMS,
  SPAWN_POINTS,
  WEAPONS,
};
