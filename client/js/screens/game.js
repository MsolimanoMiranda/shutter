const ROUND_REASONS = {
  BOMB_EXPLODED: 'BOMBA DETONADA — TERRORISTS WIN',
  BOMB_DEFUSED: 'BOMBA DESACTIVADA — CT WIN',
  T_ELIMINATED: 'TERRORISTS ELIMINADOS — CT WIN',
  CT_ELIMINATED: 'CT ELIMINADOS — T WIN',
  TIME_EXPIRED: 'TIEMPO AGOTADO — CT WIN',
};

const GameScreen = {
  renderer: null,
  controls: null,
  localId: null,
  myTeam: null,
  radarCtx: null,
  chatOpen: false,
  chatChannel: 'team',
  inGame: false,

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas.getContext('2d');
    this.buyScreen = document.getElementById('screen-buy');
    this.chatInput = document.getElementById('chat-input');
    this.chatLog = document.getElementById('chat-log');

    this.renderer = new GameRenderer(this.canvas);
    DamageNumbers.init();
    this.controls = new FPSControls(
      this.canvas,
      (data) => gameSocket.move(data),
      (rotY, rotX) => this.renderer.triggerShootFX(rotY, rotX)
    );

    gameSocket.on('joined', (data) => {
      this.localId = data.player.id;
      this.myTeam = data.player.team;
      this.renderer.setLocalPlayer(this.localId);
      if (data.player.team) this.renderer.setTeam(data.player.team);
    });

    gameSocket.on('state', (state) => this.onStateChange(state));
    gameSocket.on('playerMoved', (data) => {
      this.renderer.updateRemotePlayer(data);
      if (data.id === this.localId) {
        const dx = Math.abs(data.x - this.controls.posX);
        const dz = Math.abs(data.z - this.controls.posZ);
        const dy = Math.abs(data.y - this.controls.posY);
        if (dx > 0.3 || dz > 0.3 || dy > 0.3) {
          this.controls.setPosition(data.x, data.y, data.z, data.rotY);
        }
      }
    });
    gameSocket.on('shot', (data) => this.onShot(data));
    gameSocket.on('chat', (msg) => this._addChatMessage(msg));
    gameSocket.on('serverError', (err) => {
      if (['NOT_IN_SITE', 'TOO_FAR', 'CANNOT_PLANT', 'CANNOT_DEFUSE'].includes(err.error)) {
        this._showMessage(err.message || err.error, 2000);
      }
    });

    document.querySelectorAll('.buy-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.buy-item').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        this._selectedItem = btn.dataset.item;
      });
    });

    document.addEventListener('keydown', (e) => this._onKeyDown(e));
    this.chatInput.addEventListener('keydown', (e) => this._onChatKeyDown(e));

    this._animate();
  },

  _onKeyDown(e) {
    if (e.target === this.chatInput) return;

    if (e.code === 'KeyY') {
      e.preventDefault();
      this._openChat('team');
    }
    if (e.code === 'KeyU') {
      e.preventDefault();
      this._openChat('global');
    }
    if (e.code === 'KeyB' && this.buyScreen.classList.contains('active')) {
      this._toggleBuy(false);
    }
    if (e.code === 'Enter' && this._selectedItem && this.buyScreen.classList.contains('active')) {
      gameSocket.buy(this._selectedItem);
    }
  },

  _onChatKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = this.chatInput.value.trim();
      if (text) {
        gameSocket.chat(this.chatChannel, text);
        this.chatInput.value = '';
      }
      this._closeChat();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this._closeChat();
    }
  },

  _openChat(channel) {
    this.chatOpen = true;
    this.chatChannel = channel;
    document.getElementById('chat-channel').textContent = channel === 'team' ? '[TEAM]' : '[GLOBAL]';
    document.getElementById('chat-input-row').classList.add('active');
    this.chatInput.focus();
    this.controls.disable();
  },

  _closeChat() {
    this.chatOpen = false;
    document.getElementById('chat-input-row').classList.remove('active');
    this.chatInput.blur();
    if (!this.buyScreen.classList.contains('active')) {
      this.controls.enable();
    }
  },

  _addChatMessage(msg) {
    const prefix = msg.channel === 'team' ? `[TEAM] ${msg.name}` : `[ALL] ${msg.name}`;
    const color = msg.team === 'terrorist' ? 't' : 'ct';
    const line = document.createElement('div');
    line.className = `chat-line ${color}`;
    line.textContent = `${prefix}: ${msg.text}`;
    this.chatLog.appendChild(line);
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
    while (this.chatLog.children.length > 30) {
      this.chatLog.removeChild(this.chatLog.firstChild);
    }
  },

  onStateChange(state) {
    const me = state.players.find((p) => p.id === this.localId);
    if (!me) return;

    this.myTeam = me.team;
    this.renderer.setTeam(me.team);
    this._updateHUD(state, me);
    this._updateBombHUD(state, me);
    this.renderer.syncPlayers(state.players, this.localId);
    this.renderer.syncBomb(state.bomb);

    if (state.chat?.length) {
      const currentCount = this.chatLog.children.length;
      if (currentCount === 0 && state.chat.length > 0) {
        state.chat.forEach((msg) => this._addChatMessage(msg));
      }
    }

    if (state.phase === 'buy') {
      this.inGame = true;
      this._toggleBuy(true);
      this.controls.disable();
      document.getElementById('buy-timer').textContent = this._formatTime(state.timeLeft);
      document.getElementById('buy-money').textContent = me.money.toLocaleString();
      this._filterBuyItems(me.team);
      this.controls.setPosition(me.x, me.y, me.z, me.rotY);
    } else if (state.phase === 'live') {
      this._toggleBuy(false);
      this.inGame = true;
      if (!this.chatOpen) this.controls.enable();
      this.controls.setPosition(me.x, me.y, me.z, me.rotY);
    } else if (state.phase === 'round_end') {
      this.inGame = false;
      const reason = ROUND_REASONS[state.roundEndReason] || `ROUND ${state.round}`;
      this._showMessage(`${reason} — ${state.scoreT}:${state.scoreCT}`);
      this.controls.disable();
    } else if (state.phase === 'match_end') {
      const winner = state.scoreT > state.scoreCT ? 'TERRORISTS' : 'COUNTER-TERRORISTS';
      this._showMessage(`${winner} WIN — ${state.scoreT}:${state.scoreCT}`);
      this.controls.disable();
    }

    const cam = this.controls.getCamera();
    if (state.phase === 'buy' || state.phase === 'live') {
      this.renderer.setMoving(this.controls.isCurrentlyMoving());
      this.renderer.setJumping(this.controls.isJumping());
      this.renderer.updateLocalCamera(cam.x, cam.y, cam.z, cam.rotY, cam.rotX);
    }
  },

  _updateBombHUD(state, me) {
    const bomb = state.bomb;
    const statusEl = document.getElementById('bomb-status');
    const fillEl = document.getElementById('bomb-bar-fill');
    const hintEl = document.getElementById('bomb-hint');

    let status = 'BOMB STATUS: IDLE';
    let progress = 0;
    let hint = '[4] PLANT | [5] DEFUSE';

    if (bomb.state === 'carried') {
      status = me.hasBomb
        ? 'LLEVAS LA BOMBA — VE A ZONA A/B'
        : `BOMBA: ${bomb.carrierName || 'T'}`;
      hint = me.hasBomb ? 'MANTÉN [4] EN ZONA A O B PARA PLANTAR' : '';
    } else if (bomb.state === 'planted') {
      status = `BOMBA PLANTADA EN ${bomb.site} — ${this._formatTime(bomb.timer)}`;
      progress = (bomb.timer / 40) * 100;
      hint = me.team === 'counter_terrorist' ? 'MANTÉN [5] CERCA DE LA BOMBA' : 'PROTEGE LA BOMBA';
      if (me.defusing) {
        const max = me.hasDefuseKit ? 5 : 10;
        progress = (bomb.defuseProgress / max) * 100;
        status = `DESACTIVANDO... ${bomb.defuseProgress}/${max}s`;
      }
    } else if (me.planting) {
      progress = (bomb.plantProgress / 3) * 100;
      status = `PLANTANDO... ${bomb.plantProgress}/3s`;
      hint = 'MANTÉN [4]';
    }

    statusEl.textContent = status;
    fillEl.style.width = `${progress}%`;
    hintEl.textContent = hint;
  },

  onShot(data) {
    this.renderer.onPlayerShot(data.id);

    if (data.hit && !data.hit.killed) {
      const target = this.renderer.playerMeshes.get(data.hit.targetId);
      if (target) {
        DamageNumbers.spawn(target.position.x, target.position.y, target.position.z, data.hit.damage, false, this.renderer.camera);
      }
      if (data.hit.targetId === this.localId) this._flashDamage();
    }

    if (data.id === this.localId) {
      document.getElementById('hud-ammo').textContent = data.ammo;
      if (data.reserve !== undefined) document.getElementById('hud-reserve').textContent = data.reserve;
      const fill = document.getElementById('ammo-bar-fill');
      if (fill) fill.style.width = `${Math.min(data.ammo / 30, 1) * 100}%`;
    }

    if (data.hit?.killed) {
      const target = this.renderer.playerMeshes.get(data.hit.targetId);
      if (target) {
        DamageNumbers.spawn(target.position.x, target.position.y, target.position.z, 0, true, this.renderer.camera);
      }
      this._addKillFeed(`${data.hit.killerName} ☠ ${data.hit.victimName}`);
    }
  },

  _flashDamage() {
    let flash = document.getElementById('damage-flash');
    if (!flash) {
      flash = document.createElement('div');
      flash.id = 'damage-flash';
      document.getElementById('screen-game').appendChild(flash);
    }
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
  },

  _updateHUD(state, me) {
    document.getElementById('hud-score-t').textContent = String(state.scoreT).padStart(2, '0');
    document.getElementById('hud-score-ct').textContent = String(state.scoreCT).padStart(2, '0');

    const displayTime = state.bomb?.state === 'planted' ? state.bomb.timer : state.timeLeft;
    document.getElementById('hud-timer').textContent = this._formatTime(displayTime);

    document.getElementById('hud-round').textContent = state.round;
    document.getElementById('hud-health').textContent = Math.max(0, Math.round(me.health));
    document.getElementById('hud-armor').textContent = Math.round(me.armor);
    document.getElementById('health-bar').style.width = `${Math.max(0, me.health)}%`;
    document.getElementById('armor-bar').style.width = `${me.armor}%`;
    document.getElementById('hud-weapon').textContent = CONFIG.WEAPON_NAMES[me.weapon] || me.weapon?.toUpperCase() || '---';
    document.getElementById('hud-ammo').textContent = me.ammo;
    document.getElementById('hud-reserve').textContent = me.reserve;
    this._updateWeaponHUD(me);

    this._drawRadar(state.players, me, state.bomb, this.controls?.getCamera?.()?.rotY);
  },

  _updateWeaponHUD(me) {
    const magSizes = { glock: 20, usp: 12, ak47: 30, m4a1: 30, deagle: 7 };
    const maxMag = magSizes[me.weapon] || 30;
    const fill = document.getElementById('ammo-bar-fill');
    if (fill) fill.style.width = `${(me.ammo / maxMag) * 100}%`;

    const panel = document.querySelector('.weapon-panel');
    if (panel) {
      panel.style.borderRightColor = me.team === 'terrorist' ? '#ff6b00' : '#a8b86a';
    }

    const svg = document.getElementById('weapon-svg');
    if (!svg) return;

    const isPistol = ['glock', 'usp', 'deagle'].includes(me.weapon);
    const isT = me.team === 'terrorist';
    const accent = isT ? '#ff6b00' : '#a8b86a';

    if (isPistol) {
      svg.innerHTML = `
        <rect x="18" y="18" width="28" height="6" rx="1" fill="#2a2a2a"/>
        <rect x="42" y="17" width="14" height="4" rx="1" fill="#1a1a1a"/>
        <rect x="14" y="20" width="6" height="10" rx="1" fill="${accent}" opacity="0.7"/>
      `;
    } else if (me.weapon === 'ak47' || (isT && !isPistol)) {
      svg.innerHTML = `
        <rect x="6" y="15" width="18" height="7" rx="1" fill="#5c3a1e"/>
        <rect x="22" y="14" width="26" height="9" rx="1" fill="#2a2a2a"/>
        <rect x="46" y="16" width="20" height="5" rx="1" fill="#1a1a1a"/>
        <rect x="28" y="22" width="6" height="10" rx="1" fill="#2a2a2a"/>
        <rect x="22" y="12" width="4" height="3" fill="${accent}"/>
      `;
    } else {
      svg.innerHTML = `
        <rect x="6" y="15" width="20" height="7" rx="1" fill="#1a1a1a"/>
        <rect x="24" y="14" width="24" height="9" rx="1" fill="#3a3a3a"/>
        <rect x="46" y="16" width="22" height="5" rx="1" fill="#1a1a1a"/>
        <rect x="28" y="22" width="5" height="9" rx="1" fill="#1a1a1a"/>
        <rect x="24" y="12" width="8" height="3" fill="${accent}"/>
      `;
    }
  },

  _drawRadar(players, me, bomb, localRotY) {
    const ctx = this.radarCtx;
    const w = 120, h = 120;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(26,27,23,0.8)';
    ctx.fillRect(0, 0, w, h);

    const scale = 1.2;
    const cx = w / 2, cy = h / 2;

    if (bomb?.state === 'planted') {
      ctx.beginPath();
      ctx.arc(cx + bomb.x * scale, cy + bomb.z * scale, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FF2200';
      ctx.fill();
    }

    players.forEach((p) => {
      if (!p.alive) return;
      const rx = cx + p.x * scale;
      const rz = cy + p.z * scale;
      const isMe = p.id === me.id;
      const isEnemy = p.team && p.team !== me.team;

      ctx.beginPath();
      ctx.arc(rx, rz, isMe ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = p.team === 'terrorist' ? '#FF6B00' : '#A8B86A';
      ctx.fill();

      if (isMe) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const rotY = isMe && localRotY !== undefined ? localRotY : p.rotY;
      if (rotY !== undefined) {
        const arrowLen = isMe ? 8 : 6;
        const ax = rx + Math.sin(rotY) * arrowLen;
        const az = rz + Math.cos(rotY) * arrowLen;
        ctx.beginPath();
        ctx.moveTo(rx, rz);
        ctx.lineTo(ax, az);
        ctx.strokeStyle = isEnemy ? 'rgba(255,107,0,0.8)' : 'rgba(168,184,106,0.9)';
        ctx.lineWidth = isMe ? 2 : 1;
        ctx.stroke();
      }

      if (p.hasBomb) {
        ctx.beginPath();
        ctx.arc(rx, rz, 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  },

  _filterBuyItems(team) {
    document.querySelectorAll('.buy-item').forEach((btn) => {
      const isT = btn.classList.contains('terrorist-only');
      const isCT = btn.classList.contains('ct-only');
      btn.classList.toggle('disabled', (isT && team !== 'terrorist') || (isCT && team !== 'counter_terrorist'));
    });
  },

  _toggleBuy(show) {
    this.buyScreen.classList.toggle('active', show);
    this.buyScreen.style.display = show ? 'flex' : 'none';
  },

  _showMessage(text, duration = 3000) {
    const el = document.getElementById('game-message');
    el.textContent = text;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), duration);
  },

  _addKillFeed(text) {
    const feed = document.getElementById('killfeed');
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.textContent = text;
    feed.prepend(entry);
    setTimeout(() => entry.remove(), 4000);
  },

  _formatTime(secs) {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.max(0, secs) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  _animate() {
    if (this.inGame || this.controls.enabled) {
      const cam = this.controls.getCamera();
      this.renderer.setMoving(this.controls.isCurrentlyMoving());
      this.renderer.setJumping(this.controls.isJumping());
      this.renderer.updateLocalCamera(cam.x, cam.y, cam.z, cam.rotY, cam.rotX);
    }
    this.renderer.render();
    requestAnimationFrame(() => this._animate());
  },
};
