// === NUEVO ARCHIVO ===

// Abrir modal para crear archivo en carpeta seleccionada
function openNewFileInFolderModal() {
  if (!state.itemToRename || !state.itemToRename.isDirectory) return;
  openModal('modal-new-file');
}

// Crear nuevo archivo
async function createNewFile() {
  const fileName = document.getElementById('input-file-name').value.trim();
  const errorDiv = document.getElementById('file-error');
  
  if (!fileName) {
    errorDiv.textContent = 'El nombre no puede estar vacío';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  // Si hay carpeta seleccionada, crear ahí; si no, en raíz
  const targetFolder = (state.itemToRename && state.itemToRename.isDirectory) 
    ? state.itemToRename.path 
    : state.projectPath;
  
  if (!targetFolder) {
    errorDiv.textContent = 'No hay carpeta de destino';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  // Validar extensión
  if (!fileName.includes('.')) {
    errorDiv.textContent = 'Incluye una extensión (ej: .txt, .md)';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  const result = await window.electronAPI.createFile(targetFolder, fileName);
  
  if (result.success) {
    closeModal('modal-new-file');
    document.getElementById('input-file-name').value = '';
    errorDiv.classList.add('hidden');
    
    const folderName = state.itemToRename ? state.itemToRename.name : 'raíz';
    showNotification(`Archivo creado en ${folderName}: ${fileName}`);
    
    // Limpiar selección
    state.itemToRename = null;
    
    // Recargar árbol y abrir el nuevo archivo
    await loadProject(state.projectPath);
    
    // Intentar abrir el archivo recién creado
    setTimeout(async () => {
      const file = { name: fileName, path: result.path };
      await openFile(file);
    }, 200);
  } else {
    errorDiv.textContent = result.error || 'Error al crear archivo';
    errorDiv.classList.remove('hidden');
  }
}

// Configurar listeners de nuevo archivo
function setupNewFileListeners() {
  document.getElementById('btn-new-file').addEventListener('click', () => {
    openModal('modal-new-file');
  });
  
  document.getElementById('btn-confirm-new-file').addEventListener('click', createNewFile);
  
  // Enter en input
  document.getElementById('input-file-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createNewFile();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    createNewFile, 
    setupNewFileListeners,
    openNewFileInFolderModal
  };
}
