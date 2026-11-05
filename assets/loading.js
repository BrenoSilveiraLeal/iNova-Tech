/* One complete orange revolution, then reveal the first rendered page frame. */
(() => {
  const root = document.documentElement;
  const loader = document.createElement("div");
  loader.className = "site-loader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-live", "polite");
  loader.setAttribute("aria-label", "Carregando");
  loader.innerHTML = `<div class="loader-content"><div class="loader-emblem" aria-hidden="true"><svg class="loader-orbit" viewBox="0 0 168 168" fill="none"><circle class="loader-ring" cx="84" cy="84" r="82" pathLength="100" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><img class="loader-mark" src="assets/favicon.svg" alt="" width="64" height="64"></div></div>`;
  root.classList.add("is-loading");
  document.body.prepend(loader);
  let pageReady = document.readyState !== "loading";
  let sceneReady = !(document.body.dataset.product || document.body.hasAttribute("data-cat"));
  let ringReady = false;
  let done = false;
  let fallback;
  function finish(force = false){
    if (done || (!force && (!pageReady || !sceneReady || !ringReady))) return;
    done = true;
    clearTimeout(fallback);
    root.classList.remove("is-loading");
    loader.classList.add("is-ready");
    setTimeout(() => loader.remove(), 200);
  }
  document.addEventListener("DOMContentLoaded", () => { pageReady = true; finish(); }, { once: true });
  addEventListener("inova:scene-ready", () => { sceneReady = true; finish(); }, { once: true });
  addEventListener("pageshow", event => { if (event.persisted) finish(true); });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ring = loader.querySelector(".loader-ring");
  const orbit = loader.querySelector(".loader-orbit");
  // Keep heavy scene construction out of the ring's short entrance animation.
  window.inovaLoaderIntro = reduced ? Promise.resolve() : Promise.all([
    ring.animate({ strokeDashoffset: [100, 0] }, { duration: 850, easing: "linear", fill: "forwards" }).finished,
    orbit.animate({ transform: ["rotate(-90deg)", "rotate(270deg)"] }, { duration: 850, easing: "linear", fill: "forwards" }).finished
  ]).catch(() => {});
  window.inovaLoaderIntro.then(() => {
    ringReady = true;
    loader.classList.add("is-complete");
    finish();
  });
  fallback = setTimeout(() => finish(true), 6000);
  finish();
})();
