const {
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
  WEAPONS,
} = require('../config');
const { BOMB_SITES } = require('./MapData');
const { moveWithCollision, distanceToPoint } = require('./Collision');
const { createPlayer, spawnPlayer, serializePlayer } = require('./Player');

const PHASE = {
  LOBBY: 'lobby',
  TEAM_SELECT: 'team_select',
  BUY: 'buy',
  LIVE: 'live',
  ROUND_END: 'round_end',
  MATCH_END: 'match_end',
};

function createBombState() {
  return {
    state: 'idle',
    carrierId: null,
    site: null,
    x: 0,
    z: 0,
    plantProgress: 0,
    defuseProgress: 0,
    defuserId: null,
    timer: 0,
  };
}

class GameServer {
  constructor() {
    this.players = new Map();
    this.phase = PHASE.LOBBY;
    this.round = 0;
    this.scoreT = 0;
    this.scoreCT = 0;
    this.timeLeft = 0;
    this.tickInterval = null;
    this.bomb = createBombState();
    this.chatHistory = [];
    this.roundEndReason = null;
    this.physicsInterval = null;
  }

  getState() {
    const carrier = this.bomb.carrierId ? this.players.get(this.bomb.carrierId) : null;
    return {
      phase: this.phase,
      map: MAP_NAME,
      maxPlayers: MAX_PLAYERS,
      playerCount: this.players.size,
      round: this.round,
      maxRounds: MAX_ROUNDS,
      scoreT: this.scoreT,
      scoreCT: this.scoreCT,
      timeLeft: this.timeLeft,
      roundEndReason: this.roundEndReason,
      bomb: {
        state: this.bomb.state,
        site: this.bomb.site,
        x: this.bomb.x,
        z: this.bomb.z,
        timer: this.bomb.timer,
        plantProgress: this.bomb.plantProgress,
        defuseProgress: this.bomb.defuseProgress,
        carrierName: carrier?.name || null,
      },
      chat: this.chatHistory.slice(-20),
      players: [...this.players.values()].map(serializePlayer),
    };
  }

  addPlayer(socketId, name) {
    if (this.players.size >= MAX_PLAYERS) {
      return { error: 'SERVER_FULL', message: 'Servidor lleno (máx. 10 jugadores)' };
    }
    const player = createPlayer(socketId, name || `OPERATOR_${this.players.size + 1}`);
    this.players.set(socketId, player);

    if (this.players.size >= 2 && this.phase === PHASE.LOBBY) {
      this.phase = PHASE.TEAM_SELECT;
    }
    return { player: serializePlayer(player), state: this.getState() };
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player?.hasBomb && this.bomb.state === 'carried') {
      this.bomb.carrierId = null;
      player.hasBomb = false;
      this._assignBombCarrier();
    }
    if (this.bomb.defuserId === socketId) {
      this.bomb.defuserId = null;
      this.bomb.defuseProgress = 0;
    }
    this.players.delete(socketId);
    if (this.players.size < 2 && this.phase !== PHASE.MATCH_END) {
      this.phase = PHASE.LOBBY;
      this.stopTick();
    }
    return this.getState();
  }

  selectTeam(socketId, team) {
    const player = this.players.get(socketId);
    if (!player) return { error: 'NOT_FOUND' };
    if (!['terrorist', 'counter_terrorist'].includes(team)) {
      return { error: 'INVALID_TEAM' };
    }

    const teamCount = [...this.players.values()].filter((p) => p.team === team).length;
    const otherTeam = team === 'terrorist' ? 'counter_terrorist' : 'terrorist';
    const otherCount = [...this.players.values()].filter((p) => p.team === otherTeam).length;

    if (teamCount >= 5) {
      return { error: 'TEAM_FULL', message: 'Equipo lleno (máx. 5 por lado)' };
    }
    if (Math.abs(teamCount + 1 - otherCount) > 1 && otherCount > 0) {
      return { error: 'UNBALANCED', message: 'Los equipos deben estar balanceados' };
    }

    player.team = team;
    return { player: serializePlayer(player), state: this.getState() };
  }

  autoSelectTeam(socketId) {
    const tCount = [...this.players.values()].filter((p) => p.team === 'terrorist').length;
    const ctCount = [...this.players.values()].filter((p) => p.team === 'counter_terrorist').length;
    const team = tCount <= ctCount ? 'terrorist' : 'counter_terrorist';
    return this.selectTeam(socketId, team);
  }

  tryStartMatch() {
    const allHaveTeam = [...this.players.values()].every((p) => p.team);
    const minPlayers = this.players.size >= 2;
    if (!allHaveTeam || !minPlayers) {
      return { error: 'NOT_READY', message: 'Todos deben elegir equipo (mín. 2 jugadores)' };
    }
    this.startRound();
    return { state: this.getState() };
  }

  startRound() {
    this.round += 1;
    this.phase = PHASE.BUY;
    this.timeLeft = BUY_TIME;
    this.roundEndReason = null;
    this.bomb = createBombState();

    let tIdx = 0;
    let ctIdx = 0;
    for (const player of this.players.values()) {
      if (this.round === 1) player.money = 800;
      else player.money = Math.min(player.money + (player.team === 'terrorist' ? 3250 : 3400), 16000);
      player.hasDefuseKit = false;
      spawnPlayer(player, player.team === 'terrorist' ? tIdx++ : ctIdx++);
    }

    this._assignBombCarrier();
    this.startTick();
    return this.getState();
  }

  _assignBombCarrier() {
    const ts = [...this.players.values()].filter((p) => p.team === 'terrorist' && p.alive);
    if (ts.length === 0) return;

    for (const p of this.players.values()) p.hasBomb = false;

    const carrier = ts[Math.floor(Math.random() * ts.length)];
    carrier.hasBomb = true;
    this.bomb.state = 'carried';
    this.bomb.carrierId = carrier.id;
  }

  startTick() {
    this.stopTick();
    this.tickInterval = setInterval(() => this.tick(), 1000);
    this.startPhysics();
  }

  stopTick() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.stopPhysics();
  }

  startPhysics() {
    this.stopPhysics();
    this.physicsInterval = setInterval(() => this._physicsStep(), 33);
  }

  stopPhysics() {
    if (this.physicsInterval) {
      clearInterval(this.physicsInterval);
      this.physicsInterval = null;
    }
  }

  _physicsStep() {
    if (this.phase !== PHASE.LIVE) return;
    const dt = 0.033;
    for (const player of this.players.values()) {
      if (!player.alive || player.y <= GROUND_Y + 0.01) continue;
      this._applyGravity(player, dt);
    }
  }

  _applyGravity(player, dt) {
    player.velY -= GRAVITY * dt;
    player.y += player.velY * dt;
    if (player.y <= GROUND_Y) {
      player.y = GROUND_Y;
      player.velY = 0;
    }
  }

  jump(socketId) {
    const player = this.players.get(socketId);
    if (!player || !player.alive || this.phase !== PHASE.LIVE) return null;
    if (player.y > GROUND_Y + 0.05) return { error: 'IN_AIR' };
    player.velY = JUMP_FORCE;
    return { id: player.id, y: player.y, velY: player.velY };
  }

  tick() {
    if (this.phase === PHASE.LIVE) {
      this._processBombActions();
    }

    this.timeLeft -= 1;

    if (this.phase === PHASE.BUY && this.timeLeft <= 0) {
      this.phase = PHASE.LIVE;
      this.timeLeft = ROUND_TIME;
    } else if (this.phase === PHASE.LIVE) {
      if (this.bomb.state === 'planted') {
        this.bomb.timer -= 1;
        if (this.bomb.timer <= 0) {
          this.bomb.state = 'exploded';
          this.endRound('terrorist', 'BOMB_EXPLODED');
          return;
        }
      } else if (this.timeLeft <= 0) {
        this.endRound('counter_terrorist', 'TIME_EXPIRED');
        return;
      }
      this.checkRoundEnd();
    } else if (this.phase === PHASE.ROUND_END) {
      if (this.timeLeft <= 0) {
        if (this.scoreT >= WIN_SCORE || this.scoreCT >= WIN_SCORE || this.round >= MAX_ROUNDS) {
          this.phase = PHASE.MATCH_END;
          this.stopTick();
        } else {
          this.startRound();
        }
      }
    }
  }

  _processBombActions() {
    for (const player of this.players.values()) {
      if (player.planting && player.alive && player.hasBomb && this.bomb.state === 'carried') {
        const site = this._getBombSiteAt(player.x, player.z);
        if (site) {
          this.bomb.plantProgress += 1;
          if (this.bomb.plantProgress >= PLANT_TIME) {
            this._completePlant(player, site);
          }
        } else {
          player.planting = false;
          this.bomb.plantProgress = 0;
        }
      }

      if (player.defusing && player.alive && player.team === 'counter_terrorist' && this.bomb.state === 'planted') {
        const dist = distanceToPoint(player.x, player.z, this.bomb.x, this.bomb.z);
        if (dist <= DEFUSE_RADIUS) {
          this.bomb.defuserId = player.id;
          this.bomb.defuseProgress += 1;
          const needed = player.hasDefuseKit ? DEFUSE_TIME_KIT : DEFUSE_TIME;
          if (this.bomb.defuseProgress >= needed) {
            this.bomb.state = 'defused';
            player.defusing = false;
            this.endRound('counter_terrorist', 'BOMB_DEFUSED');
          }
        } else {
          player.defusing = false;
          this.bomb.defuseProgress = 0;
          this.bomb.defuserId = null;
        }
      }
    }
  }

  _getBombSiteAt(x, z) {
    for (const [name, site] of Object.entries(BOMB_SITES)) {
      if (distanceToPoint(x, z, site.x, site.z) <= site.radius) return name;
    }
    return null;
  }

  _completePlant(player, site) {
    player.hasBomb = false;
    player.planting = false;
    this.bomb.state = 'planted';
    this.bomb.site = site;
    this.bomb.x = BOMB_SITES[site].x;
    this.bomb.z = BOMB_SITES[site].z;
    this.bomb.carrierId = null;
    this.bomb.plantProgress = PLANT_TIME;
    this.bomb.timer = BOMB_TIMER;
    this.bomb.defuseProgress = 0;
  }

  setPlanting(socketId, active) {
    const player = this.players.get(socketId);
    if (!player || !player.alive || this.phase !== PHASE.LIVE) return null;
    if (!active) {
      player.planting = false;
      this.bomb.plantProgress = 0;
      return { planting: false };
    }
    if (player.team !== 'terrorist' || !player.hasBomb || this.bomb.state !== 'carried') {
      return { error: 'CANNOT_PLANT' };
    }
    if (!this._getBombSiteAt(player.x, player.z)) {
      return { error: 'NOT_IN_SITE', message: 'Debes estar en zona A o B' };
    }
    player.planting = true;
    player.defusing = false;
    return { planting: true };
  }

  setDefusing(socketId, active) {
    const player = this.players.get(socketId);
    if (!player || !player.alive || this.phase !== PHASE.LIVE) return null;
    if (!active) {
      player.defusing = false;
      if (this.bomb.defuserId === socketId) {
        this.bomb.defuserId = null;
        this.bomb.defuseProgress = 0;
      }
      return { defusing: false };
    }
    if (player.team !== 'counter_terrorist' || this.bomb.state !== 'planted') {
      return { error: 'CANNOT_DEFUSE' };
    }
    const dist = distanceToPoint(player.x, player.z, this.bomb.x, this.bomb.z);
    if (dist > DEFUSE_RADIUS) {
      return { error: 'TOO_FAR', message: 'Acércate a la bomba' };
    }
    player.defusing = true;
    player.planting = false;
    return { defusing: true };
  }

  checkRoundEnd() {
    if (this.bomb.state === 'planted' || this.bomb.state === 'defused' || this.bomb.state === 'exploded') return;

    const aliveT = [...this.players.values()].filter((p) => p.team === 'terrorist' && p.alive).length;
    const aliveCT = [...this.players.values()].filter((p) => p.team === 'counter_terrorist' && p.alive).length;

    if (aliveT === 0 && aliveCT > 0) {
      this.endRound('counter_terrorist', 'T_ELIMINATED');
    } else if (aliveCT === 0 && aliveT > 0) {
      this.endRound('terrorist', 'CT_ELIMINATED');
    }
  }

  endRound(winner, reason) {
    if (this.phase === PHASE.ROUND_END || this.phase === PHASE.MATCH_END) return;

    if (winner === 'terrorist') this.scoreT += 1;
    else this.scoreCT += 1;

    for (const p of this.players.values()) {
      p.planting = false;
      p.defusing = false;
    }

    this.phase = PHASE.ROUND_END;
    this.timeLeft = 5;
    this.roundEndReason = reason;
  }

  updatePosition(socketId, data) {
    const player = this.players.get(socketId);
    if (!player || !player.alive || this.phase !== PHASE.LIVE) return null;

    const now = Date.now();
    const dt = Math.min((now - (player.lastMoveTime || now)) / 1000, 0.05);
    player.lastMoveTime = now;

    const dx = Math.sin(data.rotY) * data.moveZ * MOVEMENT_SPEED * dt + Math.cos(data.rotY) * data.moveX * MOVEMENT_SPEED * dt;
    const dz = Math.cos(data.rotY) * data.moveZ * MOVEMENT_SPEED * dt - Math.sin(data.rotY) * data.moveX * MOVEMENT_SPEED * dt;

    const pos = moveWithCollision(player.x, player.z, dx, dz);
    player.x = pos.x;
    player.z = pos.z;
    player.rotY = data.rotY;
    player.rotX = clamp(data.rotX, -1.2, 1.2);

    this._applyGravity(player, dt);

    if (player.planting && !this._getBombSiteAt(player.x, player.z)) {
      player.planting = false;
      this.bomb.plantProgress = 0;
    }
    if (player.defusing && this.bomb.state === 'planted') {
      const dist = distanceToPoint(player.x, player.z, this.bomb.x, this.bomb.z);
      if (dist > DEFUSE_RADIUS) {
        player.defusing = false;
        this.bomb.defuseProgress = 0;
        this.bomb.defuserId = null;
      }
    }

    return { id: player.id, x: player.x, y: player.y, z: player.z, rotY: player.rotY, rotX: player.rotX };
  }

  shoot(socketId) {
    const shooter = this.players.get(socketId);
    if (!shooter || !shooter.alive || this.phase !== PHASE.LIVE) return null;

    const weapon = WEAPONS[shooter.weapon];
    if (!weapon || Date.now() - shooter.lastShot < 60000 / weapon.fireRate) return null;
    if (shooter.ammo <= 0) return { id: shooter.id, ammo: 0, hit: null };

    shooter.ammo -= 1;
    shooter.lastShot = Date.now();
    if (shooter.planting) this.bomb.plantProgress = 0;
    if (shooter.defusing) { this.bomb.defuseProgress = 0; this.bomb.defuserId = null; }
    shooter.planting = false;
    shooter.defusing = false;

    let hit = null;
    let closest = null;
    let closestDist = Infinity;

    for (const target of this.players.values()) {
      if (target.id === shooter.id || !target.alive || target.team === shooter.team) continue;
      const dist = Math.hypot(target.x - shooter.x, target.z - shooter.z);
      if (dist < 30 && dist < closestDist) {
        const angleTo = Math.atan2(target.x - shooter.x, target.z - shooter.z);
        const angleDiff = Math.abs(normalizeAngle(angleTo - shooter.rotY));
        if (angleDiff < 0.35) {
          closest = target;
          closestDist = dist;
        }
      }
    }

    if (closest) {
      let damage = weapon.damage;
      if (closest.armor > 0) {
        const absorbed = damage * 0.5;
        closest.armor = Math.max(0, closest.armor - absorbed);
        damage *= 0.5;
      }
      closest.health -= damage;
      if (closest.health <= 0) {
        closest.alive = false;
        closest.deaths += 1;
        shooter.kills += 1;
        shooter.money = Math.min(shooter.money + 300, 16000);

        if (closest.hasBomb && this.bomb.state === 'carried') {
          closest.hasBomb = false;
          this.bomb.carrierId = null;
          this._dropBombAt(closest.x, closest.z);
        }
        if (closest.id === this.bomb.defuserId) {
          this.bomb.defuserId = null;
          this.bomb.defuseProgress = 0;
        }

        hit = { targetId: closest.id, killed: true, killerId: shooter.id, killerName: shooter.name, victimName: closest.name };
        this.checkRoundEnd();
      } else {
        hit = { targetId: closest.id, killed: false, damage: Math.round(damage) };
      }
    }

    return {
      id: shooter.id,
      ammo: shooter.ammo,
      reserve: shooter.reserve,
      hit,
      state: this.getState(),
    };
  }

  _dropBombAt(x, z) {
    const ts = [...this.players.values()].filter((p) => p.team === 'terrorist' && p.alive);
    if (ts.length > 0) {
      let nearest = ts[0];
      let minDist = Infinity;
      for (const t of ts) {
        const d = Math.hypot(t.x - x, t.z - z);
        if (d < minDist) { minDist = d; nearest = t; }
      }
      nearest.hasBomb = true;
      this.bomb.carrierId = nearest.id;
      this.bomb.state = 'carried';
    } else {
      this.bomb.state = 'idle';
    }
    this.bomb.plantProgress = 0;
  }

  buyItem(socketId, itemId) {
    const player = this.players.get(socketId);
    if (!player || this.phase !== PHASE.BUY) return { error: 'CANNOT_BUY' };

    const item = WEAPONS[itemId];
    if (!item) return { error: 'INVALID_ITEM' };
    if (player.money < item.price) return { error: 'NO_MONEY' };
    if (item.team && item.team !== 'both' && item.team !== player.team) return { error: 'WRONG_TEAM' };

    player.money -= item.price;

    if (item.type === 'equipment') {
      if (itemId === 'kevlar') player.armor = 100;
      if (itemId === 'kevlar_helmet') { player.armor = 100; player.hasHelmet = true; }
      if (itemId === 'defuse_kit') player.hasDefuseKit = true;
    } else {
      player.weapon = itemId;
      player.ammo = item.magSize;
      player.reserve = item.reserve;
    }

    return { player: serializePlayer(player), state: this.getState() };
  }

  reload(socketId) {
    const player = this.players.get(socketId);
    if (!player) return null;
    const w = WEAPONS[player.weapon];
    if (!w) return null;
    const needed = w.magSize - player.ammo;
    const transfer = Math.min(needed, player.reserve);
    player.ammo += transfer;
    player.reserve -= transfer;
    return { id: player.id, ammo: player.ammo, reserve: player.reserve };
  }

  sendChat(socketId, { channel, text }) {
    const player = this.players.get(socketId);
    if (!player || !text?.trim()) return { error: 'INVALID_MESSAGE' };

    const msg = {
      id: `${Date.now()}_${socketId}`,
      channel: channel === 'global' ? 'global' : 'team',
      team: player.team,
      name: player.name,
      text: text.trim().slice(0, 128),
      time: Date.now(),
    };

    this.chatHistory.push(msg);
    if (this.chatHistory.length > MAX_CHAT_HISTORY) {
      this.chatHistory.shift();
    }

    const recipients = [...this.players.values()].filter((p) => {
      if (msg.channel === 'global') return true;
      return p.team === player.team;
    }).map((p) => p.id);

    return { message: msg, recipients };
  }

  resetServer() {
    this.stopTick();

    this.phase = this.players.size >= 2 ? PHASE.TEAM_SELECT : PHASE.LOBBY;
    this.round = 0;
    this.scoreT = 0;
    this.scoreCT = 0;
    this.timeLeft = 0;
    this.bomb = createBombState();
    this.chatHistory = [];
    this.roundEndReason = null;

    for (const player of this.players.values()) {
      player.team = null;
      player.x = 0;
      player.y = GROUND_Y;
      player.z = 0;
      player.rotY = 0;
      player.rotX = 0;
      player.health = 100;
      player.armor = 0;
      player.hasHelmet = false;
      player.alive = true;
      player.kills = 0;
      player.deaths = 0;
      player.money = 800;
      player.weapon = null;
      player.ammo = 0;
      player.reserve = 0;
      player.velY = 0;
      player.hasBomb = false;
      player.hasDefuseKit = false;
      player.planting = false;
      player.defusing = false;
    }

    return this.getState();
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

module.exports = { GameServer, PHASE };
