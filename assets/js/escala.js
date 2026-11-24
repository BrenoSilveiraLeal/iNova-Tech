/* Escala proporcional: a tela de referência é a TV (1360 px de largura útil), onde o site
   aparece exatamente como foi desenhado (fonte raiz = 16 px, fator 1).
   Em desktops maiores ou menores, o tamanho da fonte raiz acompanha só a LARGURA da janela e
   tudo que está em rem cresce ou encolhe junto, reproduzindo a mesma composição da TV.
   A altura não entra na conta: barras do navegador a reduzem e distorceriam a escala.
   Celulares e tablets pequenos (< 900 px) mantêm o layout responsivo normal. */
(function () {
  var REF_W = 1360, MIN_DESKTOP = 900, MIN_K = 0.66, MAX_K = 2.5;
  var root = document.documentElement;

  function apply() {
    var w = window.innerWidth, k = 1;
    if (w >= MIN_DESKTOP) {
      k = Math.min(MAX_K, Math.max(MIN_K, w / REF_W));
      if (Math.abs(k - 1) < 0.02) k = 1; /* na TV (≈1360 px) fica idêntico ao original */
    }
    root.style.fontSize = (16 * k).toFixed(3) + "px";
  }
  apply();
  window.addEventListener("resize", apply);
})();
