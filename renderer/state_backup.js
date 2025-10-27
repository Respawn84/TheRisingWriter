// === ESTADO GLOBAL ===
const state = {
   projectPath: null,
   currentFile: null,
   currentFileContent: '',
   hasUnsavedChanges: false,
   pendingFile: null,
   aiConnected: false,
   itemToRename: null,
   selectedText: '',
   claudeResponse: ''
 };

// Verificación del estado de IA
async function checkAIStatus() {
  const key = await window.electronAPI.getApiKey();
  state.aiConnected = !!key;
  updateAIStatus();
}

function updateAIStatus() {
  const dot = document.getElementById('ai-dot');
  const text = document.getElementById('ai-text');
  if (state.aiConnected) {
    dot.classList.add('connected');
    text.textContent = 'IA: Conectada';
  } else {
    dot.classList.add('error');
    text.textContent = 'IA: No configurada';
  }
}

// Marcador de cambios sin guardar
function markUnsavedChanges(hasChanges) {
  state.hasUnsavedChanges = hasChanges;
  updateFileIndicator();
}

function updateFileIndicator() {
  const indicator = document.getElementById('file-indicator');
  if (!indicator) return;
  
  if (state.currentFile) {
    const fileName = state.currentFile.split('/').pop();
    indicator.textContent = state.hasUnsavedChanges ? `${fileName} •` : fileName;
  }
}

// Notificaciones
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    background: var(--success);
    color: var(--bg);
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { state, checkAIStatus, updateAIStatus, markUnsavedChanges, updateFileIndicator, showNotification };
}
