// === THE RISING WRITER - APP PRINCIPAL ===
// Orquestador que integra todos los módulos

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', async () => {
  await checkAIStatus();
  setupAllListeners();
  setupMainEventListeners();
});

// Configurar listeners de eventos principales de Electron
function setupMainEventListeners() {
  window.electronAPI.onProjectFolderOpened(loadProject);
  window.electronAPI.onSaveFile(() => saveCurrentFile());
  window.electronAPI.onShowUsageStats(() => openModal('modal-stats'));
}

// Configurar todos los listeners de la UI
function setupAllListeners() {
  setupFileSystemListeners();
  setupEditorListeners();
  setupModalListeners();
  setupNewFileListeners();
  setupMoveFileListeners();
  setupAIPanelListeners();
}
