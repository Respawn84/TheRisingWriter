// ====================================
// CONFIGURACIÓN DEL PROGRAMA
// Modal de opciones + temporizador de autoguardado
// ====================================

let autosaveTimer = null;

// ====================================
// TEMPORIZADOR DE AUTOGUARDADO
// ====================================

/**
 * Inicia (o reinicia) el temporizador de autoguardado.
 * Solo guarda el fichero activo en el editor en ese momento.
 * Si minutes === 0, cancela cualquier timer existente.
 */
function startAutosaveTimer(minutes) {
  // Limpiar timer anterior
  if (autosaveTimer !== null) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  }

  updateAutosaveIndicator(minutes);

  if (!minutes || minutes <= 0) return;

  const ms = minutes * 60 * 1000;

  autosaveTimer = setInterval(async () => {
    // Solo actuar sobre el fichero visible en el editor principal
    if (!state.currentFile) return;
    if (!state.hasUnsavedChanges) return;

    await saveCurrentFile();
    showNotification('Autoguardado ✓');
  }, ms);
}

/**
 * Muestra u oculta el indicador de autoguardado activo en la UI.
 */
function updateAutosaveIndicator(minutes) {
  const indicator = document.getElementById('autosave-indicator');
  if (!indicator) return;

  if (minutes && minutes > 0) {
    indicator.textContent = `⏱ ${minutes} min`;
    indicator.classList.add('visible');
  } else {
    indicator.classList.remove('visible');
  }
}

// ====================================
// INICIALIZACIÓN AL ARRANCAR
// ====================================

async function initAutoSave() {
  const settings = await window.electronAPI.getAppSettings();
  startAutosaveTimer(settings.autosaveMinutes || 0);
}

// ====================================
// MODAL DE CONFIGURACIÓN
// ====================================

async function prepareAppSettingsModal() {
  const settings = await window.electronAPI.getAppSettings();
  document.getElementById('input-autosave-minutes').value = settings.autosaveMinutes || 0;
}

async function saveAppSettings() {
  const minutesRaw = parseInt(document.getElementById('input-autosave-minutes').value, 10);
  const minutes = isNaN(minutesRaw) || minutesRaw < 0 ? 0 : minutesRaw;

  const result = await window.electronAPI.saveAppSettings({ autosaveMinutes: minutes });

  if (result.success) {
    startAutosaveTimer(minutes);
    closeModal('modal-app-settings');
    showNotification(
      minutes > 0
        ? `Autoguardado activado: cada ${minutes} minuto${minutes === 1 ? '' : 's'} ✓`
        : 'Autoguardado desactivado ✓'
    );
  }
}

// ====================================
// SETUP DE LISTENERS
// ====================================

function setupAppSettingsListeners() {
  // Escuchar el evento del menú nativo
  window.electronAPI.onShowAppSettings(() => openModal('modal-app-settings'));

  // Botón guardar del modal
  document.getElementById('btn-save-app-settings')
    ?.addEventListener('click', saveAppSettings);

  // Inicializar el timer con la configuración guardada
  initAutoSave();
}
