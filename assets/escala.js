/* Escala proporcional: o site é desenhado para uma tela de 1366x720 (a TV de referência).
   Em telas de desktop maiores ou menores, o tamanho da fonte raiz muda e tudo que está em rem
   (quase todo o CSS) cresce/encolhe junto, mantendo o mesmo visual. Celular (<900px) não é alterado. */
(function () {
  var REF_W = 1366, REF_H = 720, MIN_DESKTOP = 900;
  var root = document.documentElement;
  var navigation = performance.getEntriesByType("navigation")[0];

  // A atualização da página deve sempre começar do topo, mesmo quando o
  // navegador tenta restaurar a posição anterior. Navegações comuns preservam
  // o comportamento padrão de voltar/avançar.
  if (navigation && navigation.type === "reload" && "scrollRestoration" in history) {
    var scrollRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.addEventListener("pageshow", function () {
      window.scrollTo(0, 0);
      requestAnimationFrame(function () {
        history.scrollRestoration = scrollRestoration;
      });
    }, { once: true });
  }

  function apply() {
    var w = window.innerWidth, h = window.innerHeight, k = 1;
    if (w >= MIN_DESKTOP) k = Math.min(2.5, Math.max(.6, Math.min(w / REF_W, h / REF_H)));
    root.style.fontSize = (16 * k).toFixed(3) + "px";
  }
  apply();
  window.addEventListener("resize", apply);
})();
