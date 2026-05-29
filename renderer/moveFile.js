// === MOVER ARCHIVO/CARPETA ===

// Preparar modal de mover
async function prepareMoveModal() {
  if (!state.itemToRename) return;
  
  const messageEl = document.getElementById('move-message');
  const selectEl = document.getElementById('select-destination');
  const errorDiv = document.getElementById('move-error');
  
  const type = state.itemToRename.isDirectory ? 'carpeta' : 'archivo';
  messageEl.textContent = `Mover ${type} "${state.itemToRename.name}" a:`;
  
  errorDiv.classList.add('hidden');
  
  // Cargar lista de carpetas
  const folders = await window.electronAPI.listFolders(state.projectPath);
  
  selectEl.innerHTML = '<option value="">-- Selecciona carpeta --</option>';
  
  folders.forEach(folder => {
    // No permitir mover a sí mismo si es carpeta
    if (state.itemToRename.isDirectory && folder.path === state.itemToRename.path) {
      return;
    }
    
    // No permitir mover a carpetas hijas si es carpeta
    if (state.itemToRename.isDirectory && folder.path.startsWith(state.itemToRename.path + '/')) {
      return;
    }
    
    const option = document.createElement('option');
    option.value = folder.path;
    option.textContent = folder.name;
    selectEl.appendChild(option);
  });
}

// Confirmar mover
async function confirmMove() {
  if (!state.itemToRename) return;
  
  const destination = document.getElementById('select-destination').value;
  const errorDiv = document.getElementById('move-error');
  
  if (!destination) {
    errorDiv.textContent = 'Selecciona una carpeta de destino';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  const result = await window.electronAPI.moveItem(state.itemToRename.path, destination);
  
  if (result.success) {
    closeModal('modal-move');
    showNotification(`Movido a: ${destination.split('/').pop()}`);
    
    // Si es el archivo actual, actualizar path
    if (state.currentFile === state.itemToRename.path) {
      state.currentFile = result.path;
    }

    state.itemToRename = null;
    await reloadPreservingExpanded();
  } else {
    errorDiv.textContent = result.error || 'Error al mover';
    errorDiv.classList.remove('hidden');
  }
}

// Configurar listeners de mover
function setupMoveFileListeners() {
  document.getElementById('btn-confirm-move')?.addEventListener('click', confirmMove);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { prepareMoveModal, confirmMove, setupMoveFileListeners };
}
