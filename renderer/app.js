// === ORQUESTADOR PRINCIPAL ===

// Listeners globales de Electron
function setupMainEventListeners() {
  window.electronAPI.onProjectFolderOpened((path) => {
    loadProject(path);
  });
  
  window.electronAPI.onSaveFile(() => {
    saveCurrentFile();
  });
  
  window.electronAPI.onShowUsageStats(() => {
    openModal('modal-stats');
  });
}

// Inicializar todo
function setupAllListeners() {
  setupMainEventListeners();
  checkAIStatus();
  setupTabsListeners();
  setupSplitListeners();
  setupFileSystemListeners();
  setupEditorListeners();
  setupModalListeners();
  setupNewFileListeners();
  setupMoveFileListeners();
  setupAIPanelListeners();
}

// Cargar al iniciar
document.addEventListener('DOMContentLoaded', setupAllListeners);