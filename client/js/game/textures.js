function createCanvasTexture(drawFn, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createSandTexture() {
  return createCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#9a7d55';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const shade = 110 + Math.random() * 50;
      ctx.fillStyle = `rgb(${shade},${shade - 20},${shade - 45})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(70,55,35,${0.1 + Math.random() * 0.15})`;
      ctx.lineWidth = 1 + Math.random() * 3;
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      ctx.lineTo(Math.random() * size, Math.random() * size);
      ctx.stroke();
    }
  }, 512);
}

function createStoneTexture() {
  return createCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#b8a078';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 16) {
      for (let x = 0; x < size; x += 32) {
        const offset = (y / 16) % 2 === 0 ? 0 : 16;
        const shade = 160 + Math.random() * 40;
        ctx.fillStyle = `rgb(${shade},${shade - 15},${shade - 35})`;
        ctx.fillRect(x + offset, y, 30, 14);
        ctx.strokeStyle = 'rgba(60,45,30,0.3)';
        ctx.strokeRect(x + offset, y, 30, 14);
      }
    }
  }, 256);
}

function createCrateTexture() {
  return createCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#6b4c2a';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 8; i++) {
      const y = i * (size / 8);
      ctx.fillStyle = i % 2 === 0 ? '#5a3d20' : '#7a5530';
      ctx.fillRect(0, y, size, size / 8);
      ctx.strokeStyle = 'rgba(30,20,10,0.5)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(30,20,10,0.4)';
    for (let x = 0; x < size; x += size / 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
  }, 128);
}

function createMetalTexture() {
  return createCanvasTexture((ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#4a4a4a');
    grad.addColorStop(0.5, '#6a6a6a');
    grad.addColorStop(1, '#3a3a3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 8);
    }
  }, 128);
}
