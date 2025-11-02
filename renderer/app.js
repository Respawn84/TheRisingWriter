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
  
  window.electronAPI.onShowFindReplace(() => {
    openModal('modal-find-replace');
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
  setupFindReplaceListeners();
  setupAIPanelListeners();
}

// Cargar al iniciar
document.addEventListener('DOMContentLoaded', setupAllListeners);