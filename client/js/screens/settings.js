const SettingsMenu = {
  menu: null,
  open: false,

  init() {
    this.menu = document.getElementById('settings-menu');
    const btns = document.querySelectorAll('.btn-settings');

    btns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle(btn);
      });
    });

    document.getElementById('btn-restart-server').addEventListener('click', () => this._restartServer());
    document.getElementById('btn-reconnect-server').addEventListener('click', () => this._reconnect());

    document.addEventListener('click', () => this.close());
    this.menu.addEventListener('click', (e) => e.stopPropagation());

    gameSocket.on('serverRestarted', () => {
      App.toast('SERVIDOR REINICIADO — Selecciona equipo de nuevo');
      App.showScreen('teams');
      if (GameScreen.inGame) {
        GameScreen.inGame = false;
        GameScreen.controls?.disable();
      }
    });
  },

  toggle(anchor) {
    if (this.open) {
      this.close();
      return;
    }
    const rect = anchor.getBoundingClientRect();
    this.menu.style.top = `${rect.bottom + 6}px`;
    this.menu.style.right = `${window.innerWidth - rect.right}px`;
    this.menu.classList.remove('hidden');
    this.open = true;
  },

  close() {
    if (!this.open) return;
    this.menu.classList.add('hidden');
    this.open = false;
  },

  async _restartServer() {
    this.close();
    if (!confirm('¿Reiniciar el servidor?\n\nSe resetean puntuación, ronda y equipos. Los jugadores permanecen conectados.')) {
      return;
    }

    App.toast('REINICIANDO SERVIDOR...');
    const result = await gameSocket.restartServer();
    if (!result.ok) {
      App.toast(result.error || 'No se pudo reiniciar el servidor', true);
    }
  },

  async _reconnect() {
    this.close();
    App.toast('RECONECTANDO...');
    const result = await gameSocket.reconnect();
    if (result.ok) {
      App.toast('CONEXIÓN RESTAURADA');
    } else {
      App.toast('Error al reconectar', true);
    }
  },
};
