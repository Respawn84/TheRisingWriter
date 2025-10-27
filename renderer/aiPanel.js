// === PANEL DE IA ===

// Llamar a Claude API
async function callClaude(action) {
  const panel = document.getElementById('ai-panel');
  const response = document.getElementById('ai-response');
  
  panel.classList.remove('hidden');
  response.innerHTML = '<div class="loading"><div class="spinner"></div><p>Consultando...</p></div>';
  
  const result = await window.electronAPI.callClaude({
    selectedText: state.selectedText,
    action
  });
  
  if (result.success) {
    response.innerHTML = `<p>${result.response}</p>`;
    state.claudeResponse = result.response;
  } else {
    response.innerHTML = `<p style="color: var(--danger)">Error: ${result.error}</p>`;
  }
}

// Aplicar sugerencia al editor
function applySuggestion() {
  if (!state.claudeResponse) return;
  
  const editor = document.getElementById('editor');
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.value = editor.value.substring(0, start) + state.claudeResponse + editor.value.substring(end);
  document.getElementById('ai-panel').classList.add('hidden');
}

// Copiar sugerencia
function copySuggestion() {
  if (state.claudeResponse) {
    navigator.clipboard.writeText(state.claudeResponse);
    showNotification('Copiado ✓');
  }
}

// Cerrar panel
function closeAIPanel() {
  document.getElementById('ai-panel').classList.add('hidden');
}

// Configurar listeners del panel IA
function setupAIPanelListeners() {
  document.getElementById('btn-close-ai').addEventListener('click', closeAIPanel);
  document.getElementById('btn-apply').addEventListener('click', applySuggestion);
  document.getElementById('btn-copy').addEventListener('click', copySuggestion);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    callClaude,
    applySuggestion,
    copySuggestion,
    closeAIPanel,
    setupAIPanelListeners
  };
}
