/* Escala proporcional: o layout foi desenhado para uma tela de referência de 1366×720.
   Em desktops maiores ou menores, o tamanho da fonte raiz acompanha a janela e tudo que está
   em rem cresce ou encolhe junto, mantendo a mesma composição em qualquer monitor.
   Celulares e tablets pequenos (< 900 px) mantêm o layout responsivo normal. */
(function () {
  var REF_W = 1366, REF_H = 720, MIN_DESKTOP = 900, MIN_K = 0.6, MAX_K = 2.5;
  var root = document.documentElement;

  function apply() {
    var w = window.innerWidth, h = window.innerHeight, k = 1;
    if (w >= MIN_DESKTOP) k = Math.min(MAX_K, Math.max(MIN_K, Math.min(w / REF_W, h / REF_H)));
    root.style.fontSize = (16 * k).toFixed(3) + "px";
  }
  apply();
  window.addEventListener("resize", apply);
})();
