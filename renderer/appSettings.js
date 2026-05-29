// ====================================
// CONFIGURACIÓN DEL PROGRAMA
// Modal de opciones + temporizador de autoguardado
// ====================================

let autosaveTimer = null;

// ====================================
// VALORES PREDETERMINADOS DEL EDITOR
// ====================================

const EDITOR_DEFAULTS = {
  editorBg:         '#1a1a24',
  editorColor:      '#d4d4e8',
  editorFontFamily: "'Georgia', 'Times New Roman', serif",
  editorFontSize:   '16',
  editorLineHeight: '1.8',
  editorPadding:    '24px',
};

// ====================================
// TEMPORIZADOR DE AUTOGUARDADO
// ====================================

/**
 * Inicia (o reinicia) el temporizador de autoguardado.
 * Solo guarda el fichero activo en el editor en ese momento.
 * Si minutes === 0, cancela cualquier timer existente.
 */
function startAutosaveTimer(minutes) {
  if (autosaveTimer !== null) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  }

  updateAutosaveIndicator(minutes);

  if (!minutes || minutes <= 0) return;

  const ms = minutes * 60 * 1000;

  autosaveTimer = setInterval(async () => {
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
// APARIENCIA DEL PANEL DE ESCRITURA
// ====================================

/**
 * Aplica las variables CSS del editor al :root del documento.
 * Se llama al arrancar y al guardar cambios.
 */
function applyEditorAppearance(settings) {
  const root = document.documentElement;

  root.style.setProperty('--editor-bg',          settings.editorBg         || EDITOR_DEFAULTS.editorBg);
  root.style.setProperty('--editor-color',        settings.editorColor      || EDITOR_DEFAULTS.editorColor);
  root.style.setProperty('--editor-font-family',  settings.editorFontFamily || EDITOR_DEFAULTS.editorFontFamily);
  root.style.setProperty('--editor-font-size',   (settings.editorFontSize   || EDITOR_DEFAULTS.editorFontSize) + 'px');
  root.style.setProperty('--editor-line-height',  settings.editorLineHeight || EDITOR_DEFAULTS.editorLineHeight);
  root.style.setProperty('--editor-padding',      settings.editorPadding    || EDITOR_DEFAULTS.editorPadding);
}

/**
 * Actualiza la vista previa del modal en tiempo real.
 */
function updateEditorPreview() {
  const preview = document.getElementById('editor-preview');
  if (!preview) return;

  const bg         = document.getElementById('input-editor-bg')?.value              || EDITOR_DEFAULTS.editorBg;
  const color      = document.getElementById('input-editor-color')?.value           || EDITOR_DEFAULTS.editorColor;
  const fontFamily = document.getElementById('select-editor-font')?.value           || EDITOR_DEFAULTS.editorFontFamily;
  const fontSize   = document.getElementById('input-editor-font-size')?.value       || EDITOR_DEFAULTS.editorFontSize;
  const lineHeight = document.getElementById('select-editor-line-height')?.value    || EDITOR_DEFAULTS.editorLineHeight;
  const padding    = document.getElementById('select-editor-padding')?.value        || EDITOR_DEFAULTS.editorPadding;

  preview.style.background  = bg;
  preview.style.color       = color;
  preview.style.fontFamily  = fontFamily;
  preview.style.fontSize    = fontSize + 'px';
  preview.style.lineHeight  = lineHeight;
  preview.style.padding     = padding;
}

/**
 * Sincroniza el swatch de color (cuadrado visible) y la etiqueta hex.
 */
function syncColorSwatch(inputId, previewId, labelId) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const label   = document.getElementById(labelId);
  if (!input || !preview) return;

  preview.style.background = input.value;
  if (label) label.textContent = input.value;
}

// ====================================
// INICIALIZACIÓN AL ARRANCAR
// ====================================

async function initAutoSave() {
  const settings = await window.electronAPI.getAppSettings();
  startAutosaveTimer(settings.autosaveMinutes || 0);
}

async function initEditorAppearance() {
  const settings = await window.electronAPI.getAppSettings();
  applyEditorAppearance(settings);
}

// ====================================
// MODAL DE CONFIGURACIÓN
// ====================================

async function prepareAppSettingsModal() {
  const settings = await window.electronAPI.getAppSettings();

  // ── Tab General ──
  document.getElementById('input-autosave-minutes').value =
    settings.autosaveMinutes || 0;

  // ── Tab Editor ──
  const bg         = settings.editorBg         || EDITOR_DEFAULTS.editorBg;
  const color      = settings.editorColor      || EDITOR_DEFAULTS.editorColor;
  const fontFamily = settings.editorFontFamily || EDITOR_DEFAULTS.editorFontFamily;
  const fontSize   = settings.editorFontSize   || EDITOR_DEFAULTS.editorFontSize;
  const lineHeight = settings.editorLineHeight || EDITOR_DEFAULTS.editorLineHeight;
  const padding    = settings.editorPadding    || EDITOR_DEFAULTS.editorPadding;

  document.getElementById('input-editor-bg').value          = bg;
  document.getElementById('input-editor-color').value       = color;
  document.getElementById('input-editor-font-size').value   = fontSize;

  // Select de fuente — buscar la opción que coincida exactamente
  const fontSelect = document.getElementById('select-editor-font');
  if (fontSelect) {
    const match = [...fontSelect.options].find(o => o.value === fontFamily);
    if (match) fontSelect.value = fontFamily;
  }

  // Select de interlineado
  const lhSelect = document.getElementById('select-editor-line-height');
  if (lhSelect) {
    const match = [...lhSelect.options].find(o => o.value === lineHeight);
    if (match) lhSelect.value = lineHeight;
  }

  // Select de padding
  const padSelect = document.getElementById('select-editor-padding');
  if (padSelect) {
    const match = [...padSelect.options].find(o => o.value === padding);
    if (match) padSelect.value = padding;
  }

  // Swatches iniciales
  syncColorSwatch('input-editor-bg',    'swatch-preview-editor-bg',    'label-editor-bg');
  syncColorSwatch('input-editor-color', 'swatch-preview-editor-color', 'label-editor-color');

  // Vista previa inicial
  updateEditorPreview();

  // Resetear tab a la primera
  activateSettingsTab('general');
}

async function saveAppSettings() {
  // ── General ──
  const minutesRaw = parseInt(document.getElementById('input-autosave-minutes').value, 10);
  const minutes    = isNaN(minutesRaw) || minutesRaw < 0 ? 0 : minutesRaw;

  // ── Editor ──
  const fontSizeRaw = parseInt(document.getElementById('input-editor-font-size').value, 10);
  const fontSize    = isNaN(fontSizeRaw) ? EDITOR_DEFAULTS.editorFontSize : String(fontSizeRaw);

  const settingsToSave = {
    autosaveMinutes:  minutes,
    editorBg:         document.getElementById('input-editor-bg').value,
    editorColor:      document.getElementById('input-editor-color').value,
    editorFontFamily: document.getElementById('select-editor-font').value,
    editorFontSize:   fontSize,
    editorLineHeight: document.getElementById('select-editor-line-height').value,
    editorPadding:    document.getElementById('select-editor-padding').value,
  };

  const result = await window.electronAPI.saveAppSettings(settingsToSave);

  if (result.success) {
    startAutosaveTimer(minutes);
    applyEditorAppearance(settingsToSave);
    closeModal('modal-app-settings');
    showNotification('Configuración guardada ✓');
  }
}

// ====================================
// LÓGICA DE TABS DEL MODAL
// ====================================

function activateSettingsTab(tabName) {
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.settings-tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `settings-panel-${tabName}`);
  });
}

// ====================================
// SETUP DE LISTENERS
// ====================================

function setupAppSettingsListeners() {
  // Menú nativo → abrir modal
  // (openModal ya llama a prepareAppSettingsModal internamente vía modals.js)
  window.electronAPI.onShowAppSettings(() => openModal('modal-app-settings'));

  // Botón guardar
  document.getElementById('btn-save-app-settings')
    ?.addEventListener('click', saveAppSettings);

  // Tabs de navegación
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateSettingsTab(btn.dataset.tab));
  });

  // Color pickers → swatch + preview en tiempo real
  document.getElementById('input-editor-bg')?.addEventListener('input', () => {
    syncColorSwatch('input-editor-bg', 'swatch-preview-editor-bg', 'label-editor-bg');
    updateEditorPreview();
  });

  document.getElementById('input-editor-color')?.addEventListener('input', () => {
    syncColorSwatch('input-editor-color', 'swatch-preview-editor-color', 'label-editor-color');
    updateEditorPreview();
  });

  // Controles de tipografía → preview en tiempo real
  ['select-editor-font', 'input-editor-font-size', 'select-editor-line-height', 'select-editor-padding']
    .forEach(id => {
      document.getElementById(id)?.addEventListener('change', updateEditorPreview);
      document.getElementById(id)?.addEventListener('input',  updateEditorPreview);
    });

  // Botón reset
  document.getElementById('btn-reset-editor-appearance')?.addEventListener('click', () => {
    document.getElementById('input-editor-bg').value        = EDITOR_DEFAULTS.editorBg;
    document.getElementById('input-editor-color').value     = EDITOR_DEFAULTS.editorColor;
    document.getElementById('input-editor-font-size').value = EDITOR_DEFAULTS.editorFontSize;

    const fontSelect = document.getElementById('select-editor-font');
    if (fontSelect) fontSelect.value = EDITOR_DEFAULTS.editorFontFamily;

    const lhSelect = document.getElementById('select-editor-line-height');
    if (lhSelect) lhSelect.value = EDITOR_DEFAULTS.editorLineHeight;

    const padSelect = document.getElementById('select-editor-padding');
    if (padSelect) padSelect.value = EDITOR_DEFAULTS.editorPadding;

    syncColorSwatch('input-editor-bg',    'swatch-preview-editor-bg',    'label-editor-bg');
    syncColorSwatch('input-editor-color', 'swatch-preview-editor-color', 'label-editor-color');
    updateEditorPreview();
  });

  // Inicialización al arrancar
  initAutoSave();
  initEditorAppearance();
}
