// === SISTEMA DE MODALES ===

// Abrir modal
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('hidden');
  
  if (modalId === 'modal-stats') loadStats();
  if (modalId === 'modal-ai-config') loadAIConfig();
  if (modalId === 'modal-prompts-config') preparePromptsConfigModal();
  if (modalId === 'modal-cost-report') loadCostReport();
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
  document.getElementById('input-admin-api-key').value = config.adminApiKey || '';
  document.getElementById('select-model').value = config.model;
  document.getElementById('input-spend-limit').value = config.spendLimit || '';
  document.getElementById('input-price-in').value = pricing.inputPrice;
  document.getElementById('input-price-out').value = pricing.outputPrice;

  // Ollama
  document.getElementById('input-ollama-url').value = config.ollamaUrl || 'http://localhost:11434';
  document.getElementById('input-ollama-model').value = config.ollamaModel || 'qwen2.5:7b-instruct';
  const temp = config.ollamaTemperature !== undefined ? config.ollamaTemperature : 0.2;
  document.getElementById('input-ollama-temperature').value = temp;
  document.getElementById('ollama-temp-display').textContent = parseFloat(temp).toFixed(2);
  document.getElementById('input-ollama-timeout').value = config.ollamaTimeout !== undefined ? config.ollamaTimeout : 120;

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
    adminApiKey: document.getElementById('input-admin-api-key').value.trim(),
    model: document.getElementById('select-model').value,
    spendLimit: parseFloat(document.getElementById('input-spend-limit').value) || 0,
    ollamaUrl: document.getElementById('input-ollama-url').value.trim(),
    ollamaModel: document.getElementById('input-ollama-model').value.trim(),
    ollamaTemperature: parseFloat(document.getElementById('input-ollama-temperature').value),
    ollamaTimeout: parseInt(document.getElementById('input-ollama-timeout').value, 10) || 120
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

// === MODAL COSTES DE LA API ===
async function loadCostReport() {
  const loading = document.getElementById('cost-report-loading');
  const errorEl = document.getElementById('cost-report-error');
  const content = document.getElementById('cost-report-content');
  loading.classList.remove('hidden');
  errorEl.classList.add('hidden');
  content.classList.add('hidden');

  const result = await window.electronAPI.getCostReport();
  loading.classList.add('hidden');

  if (!result.success) {
    let msg = result.error || 'No se pudo obtener el informe de costes.';
    if (result.status === 401) {
      msg = 'Clave no autorizada. El informe de costes requiere una Admin API key (sk-ant-admin…). Configúrala en IA → Configuración.';
    }
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    return;
  }

  // Sumar importes por bucket (día) y total.
  const buckets = (result.data?.data || []).map(bucket => {
    const amount = (bucket.results || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const currency = bucket.results?.[0]?.currency || 'USD';
    return { date: (bucket.starting_at || '').slice(0, 10), amount, currency };
  });

  const total = buckets.reduce((s, b) => s + b.amount, 0);
  const currency = buckets.find(b => b.amount > 0)?.currency || 'USD';
  document.getElementById('cost-report-total-value').textContent = `${formatMoney(total)} ${currency}`;

  const table = document.getElementById('cost-report-table');
  const withSpend = buckets.filter(b => b.amount > 0);
  if (withSpend.length === 0) {
    table.innerHTML = '<p class="empty-state">Sin gasto registrado este mes</p>';
  } else {
    table.innerHTML = withSpend.map(b => `
      <div class="cost-report-row">
        <span class="cost-report-date">${b.date}</span>
        <span class="cost-report-amount">${formatMoney(b.amount)} ${b.currency}</span>
      </div>
    `).join('');
  }

  content.classList.remove('hidden');
}

function formatMoney(n) {
  return `$${n.toFixed(2)}`;
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
  document.getElementById('btn-toggle-admin-api-key').addEventListener('click', () => {
    const input = document.getElementById('input-admin-api-key');
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
