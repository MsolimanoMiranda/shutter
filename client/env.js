function resolveServerUrl() {
  if (window.GAME_SERVER_URL) return window.GAME_SERVER_URL;

  const host = window.location.hostname || 'localhost';
  const port = window.location.port;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';

  // Desarrollo local: cliente en :3000, servidor en :3001
  if (isLocal && (port === '3000' || !port)) {
    const h = host === '::1' || host === '[::1]' ? 'localhost' : host;
    return `http://${h}:3001`;
  }

  // VPS / produccion: mismo origen (Express sirve client + Socket.io)
  return window.location.origin;
}

window.GAME_SERVER_URL = window.GAME_SERVER_URL || resolveServerUrl();
