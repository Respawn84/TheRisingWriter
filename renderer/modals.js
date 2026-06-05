// === SISTEMA DE MODALES ===

// Abrir modal
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('hidden');
  
  if (modalId === 'modal-stats') loadStats();
  if (modalId === 'modal-ai-config') loadAIConfig();
  if (modalId === 'modal-rename') prepareRenameModal();
  if (modalId === 'modal-delete') prepareDeleteModal();
  if (modalId === 'modal-new-file') prepareNewFileModal();
  if (modalId === 'modal-move') prepareMoveModal();
  if (modalId === 'modal-find-replace') prepareFindReplaceModal();
  if (modalId === 'modal-project-metadata') openProjectMetadataModal();
  if (modalId === 'modal-app-settings') prepareAppSettingsModal();
}

// Cerrar modal
function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// Configurar handlers de cierre
function setupModalCloseHandlers() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.querySelector('.modal-backdrop')?.addEventListener('click', () => {
      closeModal(modal.id);
    });
    modal.querySelector('.btn-close')?.addEventListener('click', () => {
      closeModal(modal.id);
    });
    modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
      closeModal(modal.id);
    });
  });
}

// === MODAL STATS ===
async function loadStats() {
  const stats = await window.electronAPI.getUsageStats();
  document.getElementById('stat-input').textContent = stats.totalInputTokens.toLocaleString();
  document.getElementById('stat-output').textContent = stats.totalOutputTokens.toLocaleString();
  document.getElementById('stat-cost').textContent = `$${stats.totalCost.toFixed(4)}`;
  
  const container = document.getElementById('recent-txs');
  if (stats.recentTransactions.length === 0) {
    container.innerHTML = '<p class="empty-state">Sin transacciones</p>';
    return;
  }
  
  container.innerHTML = stats.recentTransactions.map(tx => `
    <div class="tx-item">
      <div class="tx-header">
        <span class="tx-action">${tx.action}</span>
        <span class="tx-cost">$${tx.cost.toFixed(4)}</span>
      </div>
      <div class="tx-tokens">${tx.inputTokens} in / ${tx.outputTokens} out</div>
    </div>
  `).join('');
}

// === MODAL CONFIGURACIÓN IA ===
async function loadAIConfig() {
  const [config, pricing] = await Promise.all([
    window.electronAPI.getAIConfig(),
    window.electronAPI.getPricing()
  ]);
  document.getElementById('input-api-key').value = config.apiKey || '';
  document.getElementById('select-model').value = config.model;
  document.getElementById('input-price-in').value = pricing.inputPrice;
  document.getElementById('input-price-out').value = pricing.outputPrice;
}

async function saveAIConfig() {
  const config = {
    apiKey: document.getElementById('input-api-key').value.trim(),
    model: document.getElementById('select-model').value
  };
  const pricing = {
    inputPrice: parseFloat(document.getElementById('input-price-in').value),
    outputPrice: parseFloat(document.getElementById('input-price-out').value)
  };

  const [configResult, pricingResult] = await Promise.all([
    window.electronAPI.saveAIConfig(config),
    window.electronAPI.savePricing(pricing)
  ]);

  if (configResult.success && pricingResult.success) {
    closeModal('modal-ai-config');
    showNotification('Configuración de IA guardada ✓');
  } else {
    const errorEl = document.getElementById('ai-config-error');
    errorEl.textContent = configResult.error || pricingResult.error || 'Error al guardar';
    errorEl.classList.remove('hidden');
  }
}

// === MODAL RENAME ===
function prepareRenameModal() {
  if (!state.itemToRename) return;
  
  const input = document.getElementById('input-rename');
  const errorDiv = document.getElementById('rename-error');
  
  input.value = state.itemToRename.name;
  errorDiv.classList.add('hidden');
  errorDiv.textContent = '';
  
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
}

function openRenameModal() {
  openModal('modal-rename');
}

// === MODAL DELETE ===
function prepareDeleteModal() {
  if (!state.itemToRename) return;
  
  const message = document.getElementById('delete-message');
  const type = state.itemToRename.isDirectory ? 'carpeta' : 'archivo';
  message.textContent = `¿Estás seguro de que quieres borrar ${type} "${state.itemToRename.name}"?`;
}

function openDeleteModal() {
  openModal('modal-delete');
}

// === MODAL NEW FILE ===
function prepareNewFileModal() {
  const input = document.getElementById('input-file-name');
  const errorDiv = document.getElementById('file-error');
  
  input.value = '';
  errorDiv.classList.add('hidden');
  errorDiv.textContent = '';
  
  setTimeout(() => input.focus(), 100);
}

function openMoveModal() {
  openModal('modal-move');
}

// === MODAL UNSAVED CHANGES ===

async function handleSaveAndContinue() {
  await saveCurrentFile();
  closeModal('modal-unsaved');
  await openPendingFile();
}

function handleDiscardChanges() {
  markUnsavedChanges(false);
  closeModal('modal-unsaved');
  openPendingFile();
}


// === LISTENERS DE MODALES ===
function setupModalListeners() {
  setupModalCloseHandlers();
  
  // Toolbar
  document.getElementById('btn-stats').addEventListener('click', () => openModal('modal-stats'));
  
  // Stats modal
  document.getElementById('btn-ai-config').addEventListener('click', () => {
    closeModal('modal-stats');
    openModal('modal-ai-config');
  });

  document.getElementById('btn-log').addEventListener('click', () => {
    window.electronAPI.openLogFile();
  });

  document.getElementById('btn-ai-trace').addEventListener('click', () => {
    window.electronAPI.openAITraceLog();
  });

  // Configuración IA modal
  document.getElementById('btn-save-ai-config').addEventListener('click', saveAIConfig);
  document.getElementById('btn-toggle-api-key').addEventListener('click', () => {
    const input = document.getElementById('input-api-key');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  
  // Folder modal
  document.getElementById('btn-confirm-folder').addEventListener('click', createFolder);
  
  // Rename modal
  document.getElementById('btn-confirm-rename').addEventListener('click', confirmRename);
  
  // Delete modal
  document.getElementById('btn-confirm-delete').addEventListener('click', confirmDelete);
  // Unsaved changes modal
  document.getElementById('btn-save-and-continue').addEventListener('click', handleSaveAndContinue);
  document.getElementById('btn-discard').addEventListener('click', handleDiscardChanges);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    openModal,
    closeModal,
    openRenameModal,
    openDeleteModal,
    setupModalListeners
  };
}
