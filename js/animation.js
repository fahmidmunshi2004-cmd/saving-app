(function () {
  const appModal = document.getElementById('appModal');
  if (!appModal) return;

  const modalCard = appModal.querySelector('.modal-card');
  if (!modalCard) return;

  let rafId = 0;
  let lastTs = 0;
  let angle = 0;
  const speedDegPerSec = 110;

  function tick(ts) {
    if (!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    angle = (angle + speedDegPerSec * dt) % 360;
    modalCard.style.setProperty('--modal-spin-angle', angle.toFixed(2) + 'deg');
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (rafId) return;
    lastTs = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function sync() {
    const visible = !appModal.classList.contains('hidden');
    if (visible) start();
    else stop();
  }

  const observer = new MutationObserver(sync);
  observer.observe(appModal, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else sync();
  });

  sync();
})();
