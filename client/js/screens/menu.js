const MenuScreen = {
  init() {
    this.el = document.getElementById('screen-menu');
    this.btnJoin = document.getElementById('btn-join');
    this.inputName = document.getElementById('player-name');

    this.btnJoin.addEventListener('click', () => this.join());
    this.inputName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.join();
    });

    this._updateClock();
    setInterval(() => this._updateClock(), 1000);

    gameSocket.on('connecting', () => this._setConnecting());
    gameSocket.on('connected', () => this._setOnline());
    gameSocket.on('disconnected', () => this._setOffline());
    gameSocket.on('error', (err) => {
      this._setOffline();
      if (err.message) App.toast(err.message, true);
    });
    gameSocket.on('latency', (ms) => this._setPing(ms));
    gameSocket.on('state', (state) => this._updatePlayers(state));
    gameSocket.on('joined', () => App.showScreen('teams'));
    gameSocket.on('serverError', (err) => App.toast(err.message || err.error, true));
  },

  async join() {
    const name = this.inputName.value.trim() || 'OPERATOR_01';
    if (!gameSocket.connected) {
      await gameSocket.connect();
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!gameSocket.connected) {
      App.toast(gameSocket.lastError || 'Servidor no disponible. Ejecuta: npm run dev:server', true);
      return;
    }
    gameSocket.join(name);
  },

  _setConnecting() {
    document.getElementById('server-status').textContent = 'CONECTANDO...';
    document.getElementById('server-status').className = 'value orange';
    document.getElementById('net-status').textContent = 'HANDSHAKE';
    document.getElementById('server-ip').textContent = CONFIG.SERVER_URL.replace('http://', '').replace('https://', '');
  },

  _setOnline() {
    document.getElementById('server-status').textContent = 'ONLINE';
    document.getElementById('server-status').className = 'value green';
    document.getElementById('net-status').textContent = 'NOMINAL';
    document.getElementById('server-ip').textContent = CONFIG.SERVER_URL.replace('http://', '').replace('https://', '');
    this.btnJoin.textContent = '01 — INGRESAR AL SERVIDOR';
  },

  _setOffline() {
    document.getElementById('server-status').textContent = 'OFFLINE';
    document.getElementById('server-status').className = 'value orange';
    document.getElementById('net-status').textContent = 'DISCONNECTED';
    this.btnJoin.textContent = '01 — RECONECTAR AL SERVIDOR';
  },

  _setPing(ms) {
    document.getElementById('menu-ping').textContent = `${ms} MS`;
  },

  _updatePlayers(state) {
    document.getElementById('menu-players').textContent = `${state.playerCount} / ${state.maxPlayers}`;
  },

  _updateClock() {
    const now = new Date();
    document.getElementById('utc-time').textContent =
      `${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')} UTC`;
  },
};
