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
   claudeResponse: '',
   // Tabs y split
   openTabs: [],        // Array de { name, path, content }
   activeTabIndex: -1,  // Índice de pestaña activa
   splitActive: false,  // Si split está activo
   splitFile: null,     // Path del archivo en split derecho
   // Metadatos: item actualmente mostrado en el panel derecho
  splitMetadataItem: null,   // { name, path, isDirectory } — usado para el botón "← Volver"
  // Proyecto JSON
  projectJsonPath: null,      // Path completo al .project.json
  projectData: null,          // Datos del JSON parseado
  hasMarkedDirs: false,       // true si hay directorios marcados
  projectRootPath: null,       // Carpeta raíz del proyecto
  projectMode : "folder"      // "folder" o "json"
 };

// Verificación del estado de IA (consciente del proveedor activo)
async function checkAIStatus() {
  const config = await window.electronAPI.getAIConfig();
  const dot = document.getElementById('ai-dot');
  const text = document.getElementById('ai-text');
  dot.classList.remove('connected', 'error');

  if (config.provider === 'ollama') {
    const result = await window.electronAPI.checkOllama();
    state.aiConnected = result.available;
    if (result.available) {
      dot.classList.add('connected');
      text.textContent = `IA: Ollama (${config.ollamaModel || 'local'})`;
    } else {
      dot.classList.add('error');
      text.textContent = 'IA: Ollama no activo';
    }
  } else {
    const key = await window.electronAPI.getApiKey();
    state.aiConnected = !!key;
    if (state.aiConnected) {
      dot.classList.add('connected');
      text.textContent = 'IA: Claude';
    } else {
      dot.classList.add('error');
      text.textContent = 'IA: No configurada';
    }
  }
}

function updateAIStatus() {
  checkAIStatus();
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
    const fileName = nameFromPath(state.currentFile);
    indicator.textContent = state.hasUnsavedChanges ? `${fileName} •` : fileName;
  }
}

// Notificaciones
function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  const bg = isError ? '#ef4444' : 'var(--success)';
  notification.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    background: ${bg};
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

function showErrorNotification(message) {
  showNotification(message, true);
}

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { state, checkAIStatus, updateAIStatus, markUnsavedChanges, updateFileIndicator, showNotification, showErrorNotification };
}