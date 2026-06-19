function triggerShootEffects(renderer, camera, viewmodel, rotY, rotX) {
  _muzzleFlash(renderer, camera, rotY, rotX);
  _viewmodelRecoil(viewmodel);
  _screenFlash();
  _crosshairKick();
}

function _muzzleFlash(renderer, camera, rotY, rotX) {
  const scene = renderer.scene;
  const flashGeo = new THREE.SphereGeometry(0.12, 6, 6);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffaa44,
    transparent: true,
    opacity: 1,
  });
  const flash = new THREE.Mesh(flashGeo, flashMat);

  const cx = camera.position.x;
  const cy = camera.position.y;
  const cz = camera.position.z;
  const dist = 1.2;
  flash.position.set(
    cx + Math.sin(rotY) * Math.cos(rotX) * dist,
    cy + Math.sin(rotX) * dist,
    cz + Math.cos(rotY) * Math.cos(rotX) * dist
  );
  scene.add(flash);

  const light = new THREE.PointLight(0xffaa44, 3, 8);
  light.position.copy(flash.position);
  scene.add(light);

  const tracerGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(cx, cy, cz),
    new THREE.Vector3(flash.position.x, flash.position.y, flash.position.z),
  ]);
  const tracer = new THREE.Line(
    tracerGeo,
    new THREE.LineBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.8 })
  );
  scene.add(tracer);

  let frame = 0;
  const animate = () => {
    frame++;
    flashMat.opacity = 1 - frame / 5;
    light.intensity = 3 * (1 - frame / 5);
    if (frame < 5) {
      requestAnimationFrame(animate);
    } else {
      scene.remove(flash, light, tracer);
      flashGeo.dispose();
      flashMat.dispose();
      tracerGeo.dispose();
      tracer.material.dispose();
    }
  };
  animate();
}

function _viewmodelRecoil(viewmodel) {
  if (!viewmodel) return;
  viewmodel.userData.recoilKick = 0.06;
  viewmodel.userData.recoilFrames = 8;
}

function applyRecoil(viewmodel) {
  if (!viewmodel || !viewmodel.userData.recoilFrames) return;
  const base = viewmodel.userData.basePos;
  const kick = viewmodel.userData.recoilKick || 0;
  viewmodel.position.z = base.z + kick;
  viewmodel.rotation.x = -kick * 2.5;
  viewmodel.userData.recoilFrames--;
  viewmodel.userData.recoilKick *= 0.55;
  if (viewmodel.userData.recoilFrames <= 0) {
    viewmodel.userData.recoilKick = 0;
    viewmodel.rotation.x = 0;
    viewmodel.position.z = base.z;
  }
}

function _screenFlash() {
  let flash = document.getElementById('shoot-flash');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'shoot-flash';
    document.getElementById('screen-game').appendChild(flash);
  }
  flash.classList.remove('active');
  void flash.offsetWidth;
  flash.classList.add('active');
}

function _crosshairKick() {
  const ch = document.getElementById('crosshair');
  if (!ch) return;
  ch.classList.remove('kick');
  void ch.offsetWidth;
  ch.classList.add('kick');
  setTimeout(() => ch.classList.remove('kick'), 120);
}
