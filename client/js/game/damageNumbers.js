const DamageNumbers = {
  container: null,
  items: [],

  init() {
    this.container = document.getElementById('damage-numbers');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'damage-numbers';
      document.getElementById('screen-game')?.appendChild(this.container);
    }
  },

  spawn(worldX, worldY, worldZ, amount, isKill, camera) {
    if (!this.container || !camera) return;
    const el = document.createElement('div');
    el.className = `damage-num${isKill ? ' kill' : ''}`;
    el.textContent = isKill ? '☠' : `-${Math.round(amount)}`;
    this.container.appendChild(el);

    const item = {
      el,
      x: worldX,
      y: worldY + 2,
      z: worldZ,
      life: 1,
      vy: 0.02,
    };
    this.items.push(item);
    this._updatePosition(item, camera);
  },

  _updatePosition(item, camera) {
    const v = new THREE.Vector3(item.x, item.y, item.z);
    v.project(camera);
    if (v.z > 1) {
      item.el.style.display = 'none';
      return;
    }
    item.el.style.display = 'block';
    item.el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
    item.el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
  },

  update(camera, dt) {
    this.items = this.items.filter((item) => {
      item.life -= dt * 1.2;
      item.y += item.vy;
      this._updatePosition(item, camera);
      item.el.style.opacity = Math.max(0, item.life);
      if (item.life <= 0) {
        item.el.remove();
        return false;
      }
      return true;
    });
  },
};
