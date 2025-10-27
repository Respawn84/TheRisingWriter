// === SPLIT VERTICAL ===

// Toggle split vertical
function toggleSplit() {
  state.splitActive = !state.splitActive;
  
  if (state.splitActive) {
    showSplit();
  } else {
    hideSplit();
  }
}

// Mostrar split
function showSplit() {
  const editorMain = document.getElementById('editor-main');
  const editorSplit = document.getElementById('editor-split');
  const btnToggle = document.getElementById('btn-toggle-split');
  
  editorMain.classList.add('split-active');
  editorSplit.classList.remove('hidden');
  btnToggle.textContent = '⫿'; // Icono diferente cuando activo
  btnToggle.title = 'Cerrar split';
  
  // Si hay archivo en split, cargarlo
  if (state.splitFile) {
    loadSplitFile(state.splitFile);
  }
}

// Ocultar split
function hideSplit() {
  const editorMain = document.getElementById('editor-main');
  const editorSplit = document.getElementById('editor-split');
  const btnToggle = document.getElementById('btn-toggle-split');
  
  editorMain.classList.remove('split-active');
  editorSplit.classList.add('hidden');
  btnToggle.textContent = '⫽';
  btnToggle.title = 'Split vertical';
  
  state.splitFile = null;
}

// Abrir archivo en split derecho
async function openInSplit(file) {
  state.splitFile = file.path;
  
  // Activar split si no está activo
  if (!state.splitActive) {
    state.splitActive = true;
    showSplit();
  } else {
    loadSplitFile(file.path);
  }
}

// Cargar archivo en editor de split
async function loadSplitFile(filePath) {
  const editor = document.getElementById('editor-reference');
  const fileName = document.getElementById('split-file-name');
  
  const result = await window.electronAPI.readFile(filePath);
  
  if (result.success) {
    editor.value = result.content;
    fileName.textContent = `📄 ${filePath.split('/').pop()}`;
    showNotification(`Referencia cargada: ${filePath.split('/').pop()}`);
  } else {
    showNotification(`Error al leer referencia`);
    editor.value = 'Error al cargar archivo';
  }
}

// Cerrar split
function closeSplit() {
  state.splitActive = false;
  hideSplit();
}

// Configurar listeners de split
function setupSplitListeners() {
  document.getElementById('btn-toggle-split').addEventListener('click', toggleSplit);
  document.getElementById('btn-close-split').addEventListener('click', closeSplit);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    toggleSplit, openInSplit, closeSplit,
    setupSplitListeners
  };
}