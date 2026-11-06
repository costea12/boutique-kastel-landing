// Home hero - layered parallax. Two independent inputs (scroll position
// and pointer position), combined into one transform per element so each
// layer moves at its own rate instead of all moving as one flat image.
// Plain transform/opacity, rAF-batched, off entirely under reduced-motion.
(function () {
  const hero = document.querySelector('.hero-v2');
  if (!hero) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;
  // On narrow screens the discs sit in a static row under the CTA (see CSS),
  // so parallax there would only push them into the button.
  if (window.matchMedia('(max-width: 900px)').matches) return;

  const layers = Array.from(hero.querySelectorAll('[data-depth-scroll], [data-depth-mouse]'));
  if (!layers.length) return;

  let pointerX = 0; // -1..1 across hero width
  let pointerY = 0; // -1..1 across hero height
  let scrollFactor = 0; // 0..1, how far we've scrolled past the hero's own height
  let queued = false;

  function update() {
    queued = false;
    const heroHeight = hero.offsetHeight || 1;
    layers.forEach((el) => {
      const ds = parseFloat(el.dataset.depthScroll || '0');
      const dm = parseFloat(el.dataset.depthMouse || '0');
      const ty = scrollFactor * heroHeight * 0.18 * ds + pointerY * 6 * dm;
      const tx = pointerX * 6 * dm;
      el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
    });
  }

  function queueUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  function onScroll() {
    const rect = hero.getBoundingClientRect();
    // 0 when the hero's top is at the viewport top, growing toward 1 as it
    // scrolls up and out - clamped so layers settle instead of drifting
    // indefinitely once the next section has taken over.
    scrollFactor = Math.min(1, Math.max(0, -rect.top / (hero.offsetHeight || 1)));
    queueUpdate();
  }

  function onPointerMove(e) {
    const rect = hero.getBoundingClientRect();
    pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    queueUpdate();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  hero.addEventListener('pointermove', onPointerMove);
  hero.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; queueUpdate(); });

  onScroll();
})();
