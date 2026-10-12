// Mapa interno de telas (pages/index.html).
// No modo banca (MODO_BANCA em config.js) o mapa é negado e o usuário é
// levado ao destino permitido; fora da banca, revela o mapa para uso interno.
(function () {
    'use strict';

    if (typeof MODO_BANCA !== 'undefined' && MODO_BANCA) {
        window.location.replace(destinoPaginaNegada());
        return;
    }

    const aviso = document.getElementById('aviso-mapa');
    const principal = document.querySelector('.main');
    if (aviso) aviso.setAttribute('hidden', '');
    if (principal) principal.removeAttribute('hidden');
})();