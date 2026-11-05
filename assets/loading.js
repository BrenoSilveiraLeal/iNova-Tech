/* Load feedback follows real page / first 3D frame readiness, with a bounded fallback. */
(() => {
  const root = document.documentElement;
  const loader = document.createElement("div");
  loader.className = "site-loader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-live", "polite");
  loader.setAttribute("aria-label", "Carregando");
  loader.innerHTML = `<div class="loader-content"><div class="loader-emblem" aria-hidden="true"><svg class="loader-orbit" viewBox="0 0 168 168" fill="none"><path d="M84 1a83 83 0 0 1 83 83" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="167" cy="84" r="3" fill="currentColor"/></svg><img class="loader-mark" src="assets/favicon.svg" alt="" width="64" height="64"></div></div>`;
  root.classList.add("is-loading");
  document.body.prepend(loader);
  let pageReady = document.readyState === "complete";
  let sceneReady = !document.body.dataset.product;
  let done = false;
  let fallback;
  function finish(force = false){
    if (done || (!force && (!pageReady || !sceneReady))) return;
    done = true;
    clearTimeout(fallback);
    root.classList.remove("is-loading");
    loader.classList.add("is-ready");
    setTimeout(() => loader.remove(), 340);
  }
  addEventListener("load", () => { pageReady = true; finish(); }, { once: true });
  addEventListener("inova:scene-ready", () => { sceneReady = true; finish(); }, { once: true });
  addEventListener("pageshow", event => { if (event.persisted) finish(true); });
  fallback = setTimeout(() => finish(true), 6000);
  finish();
})();
