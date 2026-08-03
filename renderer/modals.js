// === SISTEMA DE MODALES ===

// El modal de buscar/reemplazar, el panel de revisión pre-editorial y el
// panel de Claude comparten la misma esquina inferior derecha — solo uno
// debe estar visible a la vez para no solaparse.
function closeOtherFloatingPanels(exceptId) {
  if (exceptId !== 'modal-find-replace') closeModal('modal-find-replace');
  if (exceptId !== 'modal-editorial-review') {
    closeModal('modal-editorial-review');
    if (typeof clearEditorialHighlightOverlay === 'function') clearEditorialHighlightOverlay();
  }
  if (exceptId !== 'ai-panel' && typeof closeAIPanel === 'function') closeAIPanel();
}

// Abrir modal
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('hidden');

  if (modalId === 'modal-stats') loadStats();
  if (modalId === 'modal-ai-config') loadAIConfig();
  if (modalId === 'modal-prompts-config') preparePromptsConfigModal();
  if (modalId === 'modal-cost-report') loadApiBalance();
  if (modalId === 'modal-rename') prepareRenameModal();
  if (modalId === 'modal-delete') prepareDeleteModal();
  if (modalId === 'modal-new-file') prepareNewFileModal();
  if (modalId === 'modal-move') prepareMoveModal();
  if (modalId === 'modal-find-replace') { closeOtherFloatingPanels('modal-find-replace'); prepareFindReplaceModal(); }
  if (modalId === 'modal-editorial-review') { closeOtherFloatingPanels('modal-editorial-review'); renderEditorialPanel(); }
  if (modalId === 'modal-project-metadata') openProjectMetadataModal();
  if (modalId === 'modal-app-settings') prepareAppSettingsModal();
  if (modalId === 'modal-git-commit') prepareGitCommitModal();
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
function toggleProviderSections(provider) {
  const isOllama = provider === 'ollama';
  document.getElementById('section-claude').classList.toggle('hidden', isOllama);
  document.getElementById('section-ollama').classList.toggle('hidden', !isOllama);
}

async function loadAIConfig() {
  const [config, pricing] = await Promise.all([
    window.electronAPI.getAIConfig(),
    window.electronAPI.getPricing()
  ]);

  // Proveedor
  const provider = config.provider || 'claude';
  document.querySelector(`input[name="ai-provider"][value="${provider}"]`).checked = true;
  toggleProviderSections(provider);

  // Claude
  document.getElementById('input-api-key').value = config.apiKey || '';
  document.getElementById('select-model').value = config.model;
  document.getElementById('input-price-in').value = pricing.inputPrice;
  document.getElementById('input-price-out').value = pricing.outputPrice;

  // Ollama
  document.getElementById('input-ollama-url').value = config.ollamaUrl || 'http://localhost:11434';
  document.getElementById('input-ollama-model').value = config.ollamaModel || 'qwen2.5:7b-instruct';
  const temp = config.ollamaTemperature !== undefined ? config.ollamaTemperature : 0.2;
  document.getElementById('input-ollama-temperature').value = temp;
  document.getElementById('ollama-temp-display').textContent = parseFloat(temp).toFixed(2);
  document.getElementById('input-ollama-timeout').value = config.ollamaTimeout !== undefined ? config.ollamaTimeout : 120;

  // Envío de texto (corrector ortotipográfico)
  const sendMode = config.sendMode || 'fragments';
  document.querySelector(`input[name="send-mode"][value="${sendMode}"]`).checked = true;
  document.getElementById('input-fragment-lines').value = config.fragmentLines || 20;
  document.getElementById('input-fragment-lines').disabled = sendMode !== 'fragments';

  // Verificar estado de Ollama si es el proveedor activo
  if (provider === 'ollama') updateOllamaStatus();
}

async function updateOllamaStatus() {
  const statusEl = document.getElementById('ollama-status');
  statusEl.textContent = 'Comprobando conexión…';
  const result = await window.electronAPI.checkOllama();
  if (result.available) {
    const modelList = result.models.length ? result.models.join(', ') : 'ninguno detectado';
    statusEl.textContent = `Ollama activo. Modelos disponibles: ${modelList}`;
    statusEl.style.color = 'var(--success, #4ade80)';
  } else {
    statusEl.textContent = 'Ollama no detectado. Arráncalo con: ollama serve';
    statusEl.style.color = 'var(--error, #ef4444)';
  }
}

async function saveAIConfig() {
  const provider = document.querySelector('input[name="ai-provider"]:checked')?.value || 'claude';
  const config = {
    provider,
    apiKey: document.getElementById('input-api-key').value.trim(),
    model: document.getElementById('select-model').value,
    ollamaUrl: document.getElementById('input-ollama-url').value.trim(),
    ollamaModel: document.getElementById('input-ollama-model').value.trim(),
    ollamaTemperature: parseFloat(document.getElementById('input-ollama-temperature').value),
    ollamaTimeout: parseInt(document.getElementById('input-ollama-timeout').value, 10) || 120,
    sendMode: document.querySelector('input[name="send-mode"]:checked')?.value || 'fragments',
    fragmentLines: parseInt(document.getElementById('input-fragment-lines').value, 10) || 20
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
    checkAIStatus();
  } else {
    const errorEl = document.getElementById('ai-config-error');
    errorEl.textContent = configResult.error || pricingResult.error || 'Error al guardar';
    errorEl.classList.remove('hidden');
  }
}

function formatMoney(n) {
  return `$${n.toFixed(2)}`;
}

// === SALDO RESTANTE ===
async function loadApiBalance() {
  const [{ balance, warnThreshold, updatedAt }, stats] = await Promise.all([
    window.electronAPI.getApiBalance(),
    window.electronAPI.getUsageStats()
  ]);

  document.getElementById('api-balance-value').textContent =
    balance === null ? 'Sin configurar' : formatMoney(balance);
  document.getElementById('api-balance-spent-value').textContent = formatMoney(stats.totalCost);
  document.getElementById('api-balance-updated-at').textContent =
    updatedAt ? `Actualizado: ${new Date(updatedAt).toLocaleString()}` : '';
  document.getElementById('input-api-balance').value = balance === null ? '' : balance;
  document.getElementById('input-api-balance-threshold').value = warnThreshold || '';
}

async function saveApiBalance() {
  const balance = parseFloat(document.getElementById('input-api-balance').value) || 0;
  const warnThreshold = parseFloat(document.getElementById('input-api-balance-threshold').value) || 0;

  const result = await window.electronAPI.saveApiBalance({ balance, warnThreshold });
  if (result.success) {
    await loadApiBalance();
    showNotification('Saldo guardado ✓');
  } else {
    showNotification(result.error || 'Error al guardar el saldo', true);
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

  // Costes de la API — saldo restante
  document.getElementById('btn-save-api-balance').addEventListener('click', saveApiBalance);
  document.getElementById('btn-toggle-api-key').addEventListener('click', () => {
    const input = document.getElementById('input-api-key');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  // Toggle proveedor
  document.querySelectorAll('input[name="ai-provider"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      toggleProviderSections(e.target.value);
      if (e.target.value === 'ollama') updateOllamaStatus();
    });
  });

  // Slider de temperatura — actualizar display en tiempo real
  document.getElementById('input-ollama-temperature').addEventListener('input', (e) => {
    document.getElementById('ollama-temp-display').textContent = parseFloat(e.target.value).toFixed(2);
  });

  // Toggle envío de texto — habilitar/deshabilitar líneas por fragmento
  document.querySelectorAll('input[name="send-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.getElementById('input-fragment-lines').disabled = e.target.value !== 'fragments';
    });
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
