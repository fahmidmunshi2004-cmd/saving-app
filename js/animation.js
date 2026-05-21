(function () {
  const appModal = document.getElementById('appModal');
  if (!appModal) return;

  const modalCard = appModal.querySelector('.modal-card');
  if (!modalCard) return;

  function ensureBorderSvg() {
    let svg = modalCard.querySelector('.modal-border-svg');
    if (svg) return svg;

    const ns = 'http://www.w3.org/2000/svg';
    svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'modal-border-svg');
    svg.setAttribute('aria-hidden', 'true');

    const defs = document.createElementNS(ns, 'defs');
    const gradient = document.createElementNS(ns, 'linearGradient');
    gradient.setAttribute('id', 'modalBorderGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');

    const stop1 = document.createElementNS(ns, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#08b7ff');
    const stop2 = document.createElementNS(ns, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#ff30ff');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);

    const runner1 = document.createElementNS(ns, 'rect');
    runner1.setAttribute('class', 'modal-border-runner runner-1');

    const runner2 = document.createElementNS(ns, 'rect');
    runner2.setAttribute('class', 'modal-border-runner runner-2');

    svg.appendChild(defs);
    svg.appendChild(runner1);
    svg.appendChild(runner2);
    modalCard.insertBefore(svg, modalCard.firstChild);
    return svg;
  }

  function layoutSvg() {
    const svg = ensureBorderSvg();
    const runners = svg.querySelectorAll('.modal-border-runner');

    const width = modalCard.clientWidth;
    const height = modalCard.clientHeight;
    const inset = 2;
    const radius = 18;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const x = inset;
    const y = inset;
    const w = Math.max(0, width - inset * 2);
    const h = Math.max(0, height - inset * 2);

    runners.forEach((runner) => {
      runner.setAttribute('x', String(x));
      runner.setAttribute('y', String(y));
      runner.setAttribute('width', String(w));
      runner.setAttribute('height', String(h));
      runner.setAttribute('rx', String(radius));
    });
  }

  const resizeObserver = new ResizeObserver(layoutSvg);
  resizeObserver.observe(modalCard);

  const modalObserver = new MutationObserver(() => {
    if (!appModal.classList.contains('hidden')) layoutSvg();
  });
  modalObserver.observe(appModal, { attributes: true, attributeFilter: ['class'] });

  layoutSvg();
})();
