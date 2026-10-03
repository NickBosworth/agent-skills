/**
 * Small trusted-host example for component-gate.svg; no external dependencies.
 * Does not autoplay and is NOT a full application state machine.
 * Pass an actual inline SVG root after mount. Use a per-instance ID namespace.
 */
export function createGateMotion(svg, { durationMs = 1800 } = {}) {
  if (!svg || svg.namespaceURI !== "http://www.w3.org/2000/svg") {
    throw new TypeError("Pass the inline SVG root after the component has mounted.");
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new RangeError("durationMs must be positive and finite.");
  }
  const boom = svg.querySelector('[data-part="boom"]');
  if (!boom) throw new Error('Missing data-part="boom".');
  const host = svg.ownerDocument.defaultView;
  if (!host || typeof boom.animate !== "function") throw new Error("A browser with WAAPI is required.");

  // Own only these two style properties. Preserve unrelated host changes.
  const hadStyleAttribute = boom.hasAttribute("style");
  const previousStyles = ["transform-box", "transform-origin"].map(name => ({
    name, value: boom.style.getPropertyValue(name), priority: boom.style.getPropertyPriority(name),
  }));
  boom.style.transformBox = "view-box";
  boom.style.transformOrigin = "0px 0px";
  const animation = boom.animate(
    [
      { transform: "rotate(0deg)", offset: 0 },
      { transform: "rotate(-70deg)", offset: 0.4 },
      { transform: "rotate(-70deg)", offset: 0.65 },
      { transform: "rotate(0deg)", offset: 1 },
    ],
    { duration: durationMs, easing: "ease-in-out", iterations: 1, fill: "both" },
  );
  animation.pause();
  animation.currentTime = 0;
  const preference = host.matchMedia("(prefers-reduced-motion: reduce)");
  let destroyed = false;
  const assertAlive = () => { if (destroyed) throw new Error("Motion controller has been destroyed."); };
  const applyPreference = () => {
    if (preference.matches) {
      animation.pause();
      animation.currentTime = 0; // Demo's meaningful static state is closed.
    }
    // Do not automatically restart motion when a preference changes back.
  };
  preference.addEventListener("change", applyPreference);
  applyPreference();

  return {
    play() {
      assertAlive();
      if (preference.matches) return;
      if (animation.playState === "finished") animation.currentTime = 0;
      animation.play();
    },
    pause() { assertAlive(); animation.pause(); },
    seek(seconds) {
      assertAlive();
      if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError("seconds must be finite and non-negative.");
      animation.pause();
      animation.currentTime = preference.matches ? 0 : Math.min(seconds * 1000, durationMs);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      preference.removeEventListener("change", applyPreference);
      animation.cancel();
      for (const { name, value, priority } of previousStyles) {
        if (value) boom.style.setProperty(name, value, priority);
        else boom.style.removeProperty(name);
      }
      if (!hadStyleAttribute && !boom.style.cssText) boom.removeAttribute("style");
    },
  };
}
