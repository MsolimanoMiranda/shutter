const App = {
  screens: ['menu', 'teams', 'game'],

  init() {
    MenuScreen.init();
    TeamSelectScreen.init();
    GameScreen.init();
    SettingsMenu.init();

    gameSocket.connect();
  },

  showScreen(name) {
    this.screens.forEach((s) => {
      const el = document.getElementById(`screen-${s}`);
      el.classList.toggle('active', s === name);
      if (s === 'game') {
        el.style.display = name === 'game' ? 'block' : 'none';
      }
    });
  },

  toast(msg, isError = false) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast${isError ? ' error' : ''}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3500);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
