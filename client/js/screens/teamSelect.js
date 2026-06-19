const TeamSelectScreen = {
  myTeam: null,
  playerId: null,

  init() {
    this.el = document.getElementById('screen-teams');

    document.getElementById('btn-team-t').addEventListener('click', () => gameSocket.selectTeam('terrorist'));
    document.getElementById('btn-team-ct').addEventListener('click', () => gameSocket.selectTeam('counter_terrorist'));
    document.getElementById('btn-auto-team').addEventListener('click', () => gameSocket.autoSelectTeam());
    document.getElementById('btn-start').addEventListener('click', () => gameSocket.startMatch());

    gameSocket.on('joined', (data) => {
      this.playerId = data.player.id;
      this.myTeam = data.player.team;
    });

    gameSocket.on('state', (state) => this.render(state));
    gameSocket.on('serverError', (err) => App.toast(err.message || err.error, true));
    gameSocket.on('latency', (ms) => {
      document.getElementById('team-ping').textContent = ms;
    });
  },

  render(state) {
    const tPlayers = state.players.filter((p) => p.team === 'terrorist');
    const ctPlayers = state.players.filter((p) => p.team === 'counter_terrorist');

    document.getElementById('count-t').textContent = tPlayers.length;
    document.getElementById('count-ct').textContent = ctPlayers.length;
    document.getElementById('team-player-count').textContent = state.playerCount;

    for (let i = 1; i <= 5; i++) {
      document.getElementById(`t-bar-${i}`).className = i <= tPlayers.length ? 'filled orange' : '';
      document.getElementById(`ct-bar-${i}`).className = i <= ctPlayers.length ? 'filled green' : '';
    }

    const me = state.players.find((p) => p.id === this.playerId);
    if (me) {
      this.myTeam = me.team;
      document.getElementById('btn-team-t').classList.toggle('selected', me.team === 'terrorist');
      document.getElementById('btn-team-ct').classList.toggle('selected', me.team === 'counter_terrorist');
    }

    const allReady = state.players.length >= 2 && state.players.every((p) => p.team);
    document.getElementById('btn-start').disabled = !allReady;

    const statusMap = {
      lobby: 'WAITING_OPERATORS',
      team_select: 'TEAM_SELECTION',
      buy: 'BUY_PHASE',
      live: 'ACTIVE_ENGAGEMENT',
      round_end: 'ROUND_END',
      match_end: 'MATCH_COMPLETE',
    };
    document.getElementById('lobby-status').textContent = statusMap[state.phase] || state.phase;

    const roster = document.getElementById('operator-roster');
    roster.innerHTML = state.players.map((p) => {
      const cls = p.team === 'terrorist' ? 't' : p.team === 'counter_terrorist' ? 'ct' : 'none';
      const tag = p.team ? CONFIG.TEAM_LABELS[p.team] : 'SIN EQUIPO';
      const isMe = p.id === this.playerId;
      const weapon = CONFIG.WEAPON_NAMES[p.weapon] || 'DEFAULT';
      return `
        <div class="operator-card ${cls}${isMe ? ' me' : ''}">
          <div class="operator-avatar ${cls}">${p.team === 'terrorist' ? 'T' : p.team === 'counter_terrorist' ? 'CT' : '?'}</div>
          <div class="operator-info">
            <div class="operator-name">${p.name}${isMe ? ' (TÚ)' : ''}</div>
            <div class="operator-meta label-mono">${tag} · ${weapon} · K:${p.kills || 0} D:${p.deaths || 0}</div>
          </div>
        </div>
      `;
    }).join('');

    const list = document.getElementById('lobby-players');
    list.innerHTML = state.players.map((p) => {
      const cls = p.team === 'terrorist' ? 't' : p.team === 'counter_terrorist' ? 'ct' : 'none';
      const tag = p.team ? CONFIG.TEAM_LABELS[p.team] : '---';
      return `<span class="player-chip ${cls}">${p.name} [${tag}]</span>`;
    }).join('');

    if (state.phase === 'buy' || state.phase === 'live' || state.phase === 'round_end') {
      App.showScreen('game');
      GameScreen.onStateChange(state);
    }
  },
};
