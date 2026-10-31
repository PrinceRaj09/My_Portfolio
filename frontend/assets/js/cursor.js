const canUseCustomCursor = window.matchMedia(
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
).matches;

if (canUseCustomCursor) {
  const halo = document.querySelector(".custom-cursor-halo");
  const dot = document.querySelector(".custom-cursor-dot");
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const follower = { ...pointer };
  let animationFrame = 0;
  let isVisible = false;

  document.body.classList.add("has-custom-cursor");

  function drawCursor() {
    follower.x += (pointer.x - follower.x) * 0.19;
    follower.y += (pointer.y - follower.y) * 0.19;
    halo.style.left = `${follower.x}px`;
    halo.style.top = `${follower.y}px`;
    dot.style.left = `${pointer.x}px`;
    dot.style.top = `${pointer.y}px`;
    animationFrame = isVisible ? window.requestAnimationFrame(drawCursor) : 0;
  }

  function setCursorVisible(visible) {
    isVisible = visible;
    halo.classList.toggle("is-visible", visible);
    dot.classList.toggle("is-visible", visible);
    if (visible && !animationFrame) animationFrame = window.requestAnimationFrame(drawCursor);
    if (!visible && animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    setCursorVisible(true);
  }, { passive: true });

  document.addEventListener("pointerover", (event) => {
    const target = event.target instanceof Element
      ? event.target.closest("a, button, input, textarea, select, [role='button']")
      : null;
    document.body.classList.toggle("cursor-over-link", Boolean(target));
  });

  window.addEventListener("pointerout", (event) => {
    if (!event.relatedTarget) setCursorVisible(false);
  });

  window.addEventListener("blur", () => setCursorVisible(false));
  window.addEventListener("focus", () => {
    pointer.x = window.innerWidth / 2;
    pointer.y = window.innerHeight / 2;
  });
  window.addEventListener("pointerdown", () => document.body.classList.add("cursor-pressed"));
  window.addEventListener("pointerup", () => document.body.classList.remove("cursor-pressed"));
}
