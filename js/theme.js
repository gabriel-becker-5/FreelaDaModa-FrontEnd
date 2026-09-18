/* Tema claro/escuro — fonte única.
   Roda no <head>, antes do body, pra restaurar o tema salvo sem flash.
   O clique no botão só muda o atributo; o MutationObserver abaixo é quem
   persiste no localStorage e sincroniza os ícones, então qualquer forma de
   trocar data-theme (clique, DevTools, outro script) fica coberta. */
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
