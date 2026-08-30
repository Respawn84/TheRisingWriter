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
    // Si es carpeta, no permitir moverla a sí misma ni a una descendiente
    // (pathMatches ya cubre el caso de igualdad)
    if (state.itemToRename.isDirectory && pathMatches(folder.path, state.itemToRename.path)) {
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
    const wasDirectory = state.itemToRename.isDirectory;
    const oldPath = state.itemToRename.path;
    const newPath = result.path;

    closeModal('modal-move');
    state.itemToRename = null;

    // Mover cambia la ruta igual que renombrar: hay que arrastrar con ella las
    // referencias de project.json y el estado en memoria.
    const migrated = await migrateProjectReferences(oldPath, newPath);
    migrateOpenStatePaths(oldPath, newPath);

    const destName = nameFromPath(destination);
    showNotification(migrated > 0
      ? `Movido a: ${destName} (${migrated} referencias actualizadas)`
      : `Movido a: ${destName}`);

    await reloadPreservingExpanded(wasDirectory ? oldPath : null, wasDirectory ? newPath : null);
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
