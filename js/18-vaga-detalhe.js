document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // 2. Lógica do botão de Candidatar-se
    const btnCandidatar = document.getElementById('btnCandidatar');
    const feedbackAlert = document.getElementById('feedbackAlert');

    if (btnCandidatar) {
        btnCandidatar.addEventListener('click', function () {
            // Impede o clique duplo
            if (this.disabled) return;

            // Estado de loading UX
            this.disabled = true;
            this.innerHTML = '<span class="spinner"></span> Enviando perfil...';

            // Simulação do tempo de requisição à API
            setTimeout(() => {
                // Exibe a mensagem de sucesso no topo
                feedbackAlert.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Altera a cor e texto do botão para indicar sucesso
                this.innerHTML = '<i class="bi bi-check-lg"></i> Candidatura Enviada';
                this.style.background = 'var(--success)';
                this.style.borderColor = 'var(--success)';
                this.style.cursor = 'default';

            }, 1200); // 1.2 segundos de "carregamento"
        });
    }
});
