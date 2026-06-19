const CONFIG = {
  get SERVER_URL() {
    return window.GAME_SERVER_URL || resolveServerUrl();
  },
  MOVEMENT_SPEED: 13,
  GROUND_Y: 1.6,
  JUMP_FORCE: 6.8,
  GRAVITY: 13.5,
  AIR_CONTROL: 0.75,

  WEAPON_NAMES: {
    glock: 'GLOCK-18',
    usp: 'USP-S',
    ak47: 'AK-47',
    m4a1: 'M4A1-S',
    deagle: 'DESERT EAGLE',
  },

  TEAM_LABELS: {
    terrorist: 'T',
    counter_terrorist: 'CT',
  },
};
