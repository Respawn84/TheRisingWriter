// === SISTEMA DE PESTAÑAS ===

// Abrir archivo en pestaña nueva o activar existente
function openTab(file) {
  window.electronAPI.saveLastFile(file.path);

  // Buscar si ya existe
  const existingIndex = state.openTabs.findIndex(tab => tab.path === file.path);

  if (existingIndex !== -1) {
    // Ya existe, solo activarla
    activateTab(existingIndex);
    return;
  }

  // Crear nueva pestaña
  const newTab = {
    name: file.name,
    path: file.path,
    content: '',
    hasChanges: false
  };

  state.openTabs.push(newTab);
  state.activeTabIndex = state.openTabs.length - 1;

  renderTabs();
  loadTabContent(state.activeTabIndex);
}

// Activar pestaña específica
function activateTab(index) {
  if (index < 0 || index >= state.openTabs.length) return;
  
  // Guardar contenido de pestaña actual si hay cambios
  if (state.activeTabIndex !== -1) {
    const currentTab = state.openTabs[state.activeTabIndex];
    const editor = document.getElementById('editor');
    currentTab.content = editor.value;
  }
  
  state.activeTabIndex = index;
  renderTabs();
  loadTabContent(index);
}

// Cerrar pestaña
function closeTab(index, event) {
  if (event) event.stopPropagation();
  
  const tab = state.openTabs[index];
  
  // Comprobar cambios sin guardar
  if (tab.hasChanges) {
    if (!confirm(`¿Cerrar "${tab.name}" sin guardar cambios?`)) {
      return;
    }
  }
  
  state.openTabs.splice(index, 1);
  
  // Ajustar índice activo
  if (state.activeTabIndex === index) {
    if (state.openTabs.length === 0) {
      state.activeTabIndex = -1;
      clearEditor();
    } else if (index >= state.openTabs.length) {
      state.activeTabIndex = state.openTabs.length - 1;
      loadTabContent(state.activeTabIndex);
    } else {
      loadTabContent(state.activeTabIndex);
    }
  } else if (state.activeTabIndex > index) {
    state.activeTabIndex--;
  }
  
  renderTabs();
}

// Renderizar pestañas
function renderTabs() {
  const container = document.getElementById('tabs-container');
  container.innerHTML = '';
  
  if (state.openTabs.length === 0) {
    container.innerHTML = '<div class="tab-empty">Sin archivos abiertos</div>';
    return;
  }
  
  state.openTabs.forEach((tab, index) => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab ${index === state.activeTabIndex ? 'active' : ''}`;
    
    const nameEl = document.createElement('span');
    nameEl.className = 'tab-name';
    nameEl.textContent = tab.hasChanges ? `${tab.name} •` : tab.name;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = (e) => closeTab(index, e);
    
    tabEl.appendChild(nameEl);
    tabEl.appendChild(closeBtn);
    tabEl.onclick = () => activateTab(index);
    
    container.appendChild(tabEl);
  });
}

// Cargar contenido de pestaña en editor
async function loadTabContent(index) {
  if (index === -1 || !state.openTabs[index]) {
    clearEditor();
    return;
  }
  
  const tab = state.openTabs[index];
  const editor = document.getElementById('editor');
  
  // Si ya tiene contenido cargado, usarlo
  if (tab.content !== '') {
    editor.value = tab.content;
    state.currentFile = tab.path;
    state.currentFileContent = tab.content;
    state.hasUnsavedChanges = tab.hasChanges;
    updateFileIndicator();
    updateWordCount();
    return;
  }
  
  // Cargar desde disco
  const result = await window.electronAPI.readFile(tab.path);
  if (result.success) {
    tab.content = result.content;
    editor.value = result.content;
    state.currentFile = tab.path;
    state.currentFileContent = result.content;
    state.hasUnsavedChanges = false;
    tab.hasChanges = false;
    updateFileIndicator();
    updateWordCount();
  } else {
    showNotification(`Error al leer: ${tab.name}`);
  }
}

// Limpiar editor
function clearEditor() {
  const editor = document.getElementById('editor');
  editor.value = '';
  state.currentFile = null;
  state.currentFileContent = '';
  state.hasUnsavedChanges = false;
  updateFileIndicator();
  updateWordCount();
}

// Marcar pestaña activa como modificada
function markTabAsModified() {
  if (state.activeTabIndex === -1) return;
  
  const tab = state.openTabs[state.activeTabIndex];
  tab.hasChanges = true;
  tab.content = document.getElementById('editor').value;
  renderTabs();
  markUnsavedChanges(true);
}

// Marcar pestaña activa como guardada
function markTabAsSaved() {
  if (state.activeTabIndex === -1) return;
  
  const tab = state.openTabs[state.activeTabIndex];
  tab.hasChanges = false;
  tab.content = document.getElementById('editor').value;
  renderTabs();
  markUnsavedChanges(false);
}

// Obtener pestaña activa
function getActiveTab() {
  if (state.activeTabIndex === -1) return null;
  return state.openTabs[state.activeTabIndex];
}

// Configurar listeners de pestañas
function setupTabsListeners() {
  // El listener del editor se mantiene en editor.js
  // Solo agregamos el del editor para marcar cambios
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    openTab, activateTab, closeTab, renderTabs, 
    markTabAsModified, markTabAsSaved, getActiveTab,
    setupTabsListeners
  };
}