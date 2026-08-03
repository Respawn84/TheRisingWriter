// === ORQUESTADOR PRINCIPAL ===

// Listeners globales de Electron
function setupMainEventListeners() {
  window.electronAPI.onProjectFolderOpened((path) => {
    loadProject(path);
  });

  window.electronAPI.onProjectFileOpened((path) => {
    //loadOrCreateProject(path);
    loadProject(path);
  });

  window.electronAPI.onRestoreSession(async ({ projectPath, filePath }) => {
    await loadProject(projectPath);
    if (filePath) {
      const fileName = filePath.split('/').pop();
      openTab({ name: fileName, path: filePath });
    }
  });

  window.electronAPI.onSaveFile(() => {
    saveCurrentFile();
  });
  
  window.electronAPI.onShowUsageStats(() => {
    openModal('modal-stats');
  });

  window.electronAPI.onShowAIConfig(() => {
    openModal('modal-ai-config');
  });

  window.electronAPI.onShowCostReport(() => {
    openModal('modal-cost-report');
  });

  window.electronAPI.onLowApiBalance(({ balance, warnThreshold }) => {
    showNotification(`Saldo por debajo de $${warnThreshold.toFixed(2)} en la API (saldo actual: $${balance.toFixed(2)})`, true);
  });

  window.electronAPI.onShowFindReplace(() => {
    openModal('modal-find-replace');
  });

  window.electronAPI.onExportEpub(() => {
    exportNovelToEpub();
  });

  window.electronAPI.onCloseProject(() => {
    closeProject();
  });
}

// Inicializar todo
function setupAllListeners() {
  setupMainEventListeners();
  checkAIStatus();
  setupProjectListeners();
  setupTabsListeners();
  setupSplitListeners();
  setupFileSystemListeners();
  setupEditorListeners();
  setupModalListeners();
  setupNewFileListeners();
  setupMoveFileListeners();
  setupFindReplaceListeners();
  setupAIPanelListeners();
  setupSceneReviewListeners();
  setupEditorialReviewListeners();
  setupNewProjectListeners();
  setupMindMapListeners();
  setupTramaTimelineListeners();
  setupGenealogyListeners();
  setupAppSettingsListeners();
  setupPromptsConfigListeners();
  setupGitListeners();
}

// Cargar al iniciar
document.addEventListener('DOMContentLoaded', setupAllListeners);
