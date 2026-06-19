const Crosshair = {
  el: null,
  spread: 4,
  bloom: 0,
  kickX: 0,
  kickY: 0,
  shootPulse: 0,
  visible: true,

  init() {
    this.el = document.getElementById('crosshair');
    if (!this.el) return;
    this.el.innerHTML = `
      <span class="ch-line ch-top"></span>
      <span class="ch-line ch-right"></span>
      <span class="ch-line ch-bottom"></span>
      <span class="ch-line ch-left"></span>
      <span class="ch-dot"></span>
    `;
    this._render();
  },

  setVisible(show) {
    this.visible = show;
    if (this.el) this.el.style.opacity = show ? '1' : '0';
  },

  onShoot() {
    this.bloom = Math.min(this.bloom + 9, 28);
    this.shootPulse = 1;
    this.kickX += (Math.random() - 0.5) * 10;
    this.kickY += (Math.random() - 0.5) * 10;
  },

  update(dt, { moving, jumping } = {}) {
    if (!this.el) return;

    this.bloom = Math.max(0, this.bloom - dt * 32);
    this.shootPulse = Math.max(0, this.shootPulse - dt * 6);
    this.kickX *= Math.pow(0.82, dt * 60);
    this.kickY *= Math.pow(0.82, dt * 60);

    let target = 3;
    if (moving) target += 7;
    if (jumping) target += 12;
    target += this.bloom;
    target += this.shootPulse * 5;

    const smooth = moving || jumping || this.bloom > 0.5 ? 14 : 22;
    this.spread += (target - this.spread) * Math.min(dt * smooth, 1);

    this._render(moving, jumping);
  },

  _render(moving, jumping) {
    const spread = this.spread.toFixed(1);
    const kickX = this.kickX.toFixed(2);
    const kickY = this.kickY.toFixed(2);
    const tense = moving || jumping || this.bloom > 2;

    this.el.style.setProperty('--spread', `${spread}px`);
    this.el.style.transform = `translate(calc(-50% + ${kickX}px), calc(-50% + ${kickY}px))`;
    this.el.classList.toggle('moving', !!moving);
    this.el.classList.toggle('jumping', !!jumping);
    this.el.classList.toggle('shooting', this.shootPulse > 0.05);
    this.el.classList.toggle('tense', tense);
    this.el.style.opacity = this.visible ? (tense ? '0.92' : '1') : '0';
  },
};
