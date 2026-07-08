// === MODAL DE PROMPTS DE IA ===

const PROMPT_ACTIONS = ['corregir', 'sinonimos', 'mejorar', 'expandir'];

let promptDefaults = {};

async function preparePromptsConfigModal() {
  const { prompts, defaults } = await window.electronAPI.getPromptsConfig();
  promptDefaults = defaults;

  for (const action of PROMPT_ACTIONS) {
    document.getElementById(`input-prompt-${action}`).value = prompts[action] || '';
  }

  document.getElementById('prompts-config-error').classList.add('hidden');
}

async function savePromptsConfig() {
  const prompts = {};
  for (const action of PROMPT_ACTIONS) {
    prompts[action] = document.getElementById(`input-prompt-${action}`).value.trim();
  }

  const result = await window.electronAPI.savePromptsConfig(prompts);

  if (result.success) {
    closeModal('modal-prompts-config');
    showNotification('Prompts guardados ✓');
  } else {
    const errorEl = document.getElementById('prompts-config-error');
    errorEl.textContent = result.error || 'Error al guardar';
    errorEl.classList.remove('hidden');
  }
}

function setupPromptsConfigListeners() {
  window.electronAPI.onShowPromptsConfig(() => openModal('modal-prompts-config'));

  document.getElementById('btn-save-prompts-config').addEventListener('click', savePromptsConfig);

  document.querySelectorAll('.btn-reset-prompt').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      document.getElementById(`input-prompt-${action}`).value = promptDefaults[action] || '';
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    preparePromptsConfigModal,
    savePromptsConfig,
    setupPromptsConfigListeners
  };
}
