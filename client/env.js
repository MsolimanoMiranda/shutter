function resolveServerUrl() {
  if (window.GAME_SERVER_URL) return window.GAME_SERVER_URL;
  const host = window.location.hostname || 'localhost';
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    return `http://${host === '::1' || host === '[::1]' ? 'localhost' : host}:3001`;
  }
  return `http://${host}:3001`;
}

window.GAME_SERVER_URL = window.GAME_SERVER_URL || resolveServerUrl();
