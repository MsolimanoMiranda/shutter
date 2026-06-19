class GameSocket {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.latency = 0;
    this.listeners = {};
    this._pingInterval = null;
    this.lastError = null;
  }

  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach((fn) => fn(data));
  }

  async connect() {
    const url = CONFIG.SERVER_URL;
    if (!url) {
      this.lastError = 'URL del servidor no configurada';
      this.emit('error', { message: this.lastError });
      return;
    }

    if (this.socket?.connected) return;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connecting = true;
    this.lastError = null;
    this.emit('connecting', { url });

    try {
      const res = await fetch(`${url}/health`, { mode: 'cors' });
      if (!res.ok) throw new Error(`Health check falló (${res.status})`);
    } catch (err) {
      this.connecting = false;
      this.lastError = `No se puede alcanzar ${url} — ¿Está corriendo el servidor?`;
      this.emit('error', { message: this.lastError });
      this.emit('disconnected');
      return;
    }

    this.socket = io(url, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 8000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.connecting = false;
      this.lastError = null;
      this.emit('connected', { url });
      this._startPing();
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.emit('disconnected');
    });

    this.socket.on('connect_error', (err) => {
      this.connecting = false;
      this.lastError = err.message || 'Error de conexión';
      this.emit('error', { message: `Conexión fallida: ${this.lastError}` });
    });

    this.socket.on('joined', (data) => this.emit('joined', data));
    this.socket.on('state', (data) => this.emit('state', data));
    this.socket.on('error', (data) => this.emit('serverError', data));
    this.socket.on('shot', (data) => this.emit('shot', data));
    this.socket.on('playerMoved', (data) => this.emit('playerMoved', data));
    this.socket.on('playerLeft', (data) => this.emit('playerLeft', data));
    this.socket.on('bought', (data) => this.emit('bought', data));
    this.socket.on('reloaded', (data) => this.emit('reloaded', data));
    this.socket.on('chat', (data) => this.emit('chat', data));
    this.socket.on('serverRestarted', (data) => this.emit('serverRestarted', data));
  }

  _startPing() {
    if (this._pingInterval) clearInterval(this._pingInterval);
    this._pingInterval = setInterval(() => {
      if (!this.socket?.connected) return;
      const start = Date.now();
      this.socket.emit('ping_check', start);
      this.socket.once('pong_check', () => {
        this.latency = Date.now() - start;
        this.emit('latency', this.latency);
      });
    }, 3000);
  }

  join(name) { this.socket?.emit('join', { name }); }
  selectTeam(team) { this.socket?.emit('selectTeam', { team }); }
  autoSelectTeam() { this.socket?.emit('autoSelectTeam'); }
  startMatch() { this.socket?.emit('startMatch'); }
  buy(itemId) { this.socket?.emit('buy', { itemId }); }
  move(data) { this.socket?.emit('move', data); }
  shoot() { this.socket?.emit('shoot'); }
  reload() { this.socket?.emit('reload'); }
  jump() { this.socket?.emit('jump'); }
  plant(active) { this.socket?.emit('plant', { active }); }
  defuse(active) { this.socket?.emit('defuse', { active }); }
  chat(channel, text) { this.socket?.emit('chat', { channel, text }); }

  async restartServer() {
    const url = CONFIG.SERVER_URL;
    try {
      const res = await fetch(`${url}/api/restart`, { method: 'POST', mode: 'cors' });
      if (res.ok) return { ok: true };
    } catch (_) { /* fallback to socket */ }
    if (this.socket?.connected) {
      this.socket.emit('restartServer');
      return { ok: true };
    }
    return { ok: false, error: 'Sin conexión al servidor' };
  }

  async reconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    await this.connect();
    return { ok: this.connected };
  }
}

const gameSocket = new GameSocket();
