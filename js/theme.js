/* Controle do tema claro/escuro — centralizado neste .JS */

(function () {
  var root = document.documentElement;

  function sincronizarIcone(tema) {
    document.querySelectorAll('.theme-toggle i').forEach(function (icone) {
      icone.className = tema === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars';
    });
  }

  try {
    var salvo = localStorage.getItem('fdlm-theme');
    if (salvo) root.setAttribute('data-theme', salvo);
  } catch (e) {}

  new MutationObserver(function () {
    var atual = root.getAttribute('data-theme');
    try { localStorage.setItem('fdlm-theme', atual); } catch (e) {}
    sincronizarIcone(atual);
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  document.addEventListener('click', function (e) {
    var botao = e.target.closest('.theme-toggle');
    if (!botao) return;
    var atual = root.getAttribute('data-theme');
    root.setAttribute('data-theme', atual === 'dark' ? 'light' : 'dark');
  });

  document.addEventListener('DOMContentLoaded', function () {
    sincronizarIcone(root.getAttribute('data-theme'));
  });
})();