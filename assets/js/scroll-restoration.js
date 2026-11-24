/* Start refreshed pages at the top without changing back/forward restoration. */
(function () {
  var navigation = performance.getEntriesByType("navigation")[0];
  if (!navigation || navigation.type !== "reload" || !("scrollRestoration" in history)) return;

  var previous = history.scrollRestoration;
  history.scrollRestoration = "manual";
  window.addEventListener("pageshow", function () {
    window.scrollTo(0, 0);
    requestAnimationFrame(function () {
      history.scrollRestoration = previous;
    });
  }, { once: true });
})();
