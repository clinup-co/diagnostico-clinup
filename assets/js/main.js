// ─────────────────────────────────────────────
// INICIALIZAÇÃO — eventos de DOMContentLoaded
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', resumeSession);

document.addEventListener('DOMContentLoaded', function() {
  ['leadName', 'leadEmail', 'leadPhone'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', function() {
      quizLeadData.nome     = document.getElementById('leadName').value;
      quizLeadData.email    = document.getElementById('leadEmail').value.toLowerCase();
      quizLeadData.telefone = document.getElementById('leadPhone').value;
      persistState();
    });
  });
});
