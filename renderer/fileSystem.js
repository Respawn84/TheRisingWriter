// === SISTEMA DE ARCHIVOS ===

// Cargar proyecto
async function loadProject(path) {
  state.projectPath = path;
  const tree = document.getElementById('file-tree');
  tree.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  const items = await window.electronAPI.readDirectory(path);
  renderFileTree(tree, items);
}

// Renderizar árbol de archivos
function renderFileTree(container, items, level = 0) {
  container.innerHTML = '';
  
  items.forEach(item => {
    if (item.isDirectory) {
      const folder = createFolderElement(item, level);
      container.appendChild(folder);
    } else if (item.isFile) {
      const file = createFileElement(item, level);
      container.appendChild(file);
    }
  });
}

// Crear elemento carpeta
function createFolderElement(folder, level) {
  const el = document.createElement('div');
  el.className = 'folder-item collapsed';
  el.style.paddingLeft = `${level * 12 + 8}px`;
  el.innerHTML = `<span class="folder-icon"></span><span>${folder.name}</span>`;
  el.dataset.path = folder.path;
  
  el.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (el.classList.contains('collapsed')) {
      el.classList.remove('collapsed');
      el.classList.add('expanded');
      const children = await window.electronAPI.readDirectory(folder.path);
      const childContainer = document.createElement('div');
      childContainer.className = 'folder-children';
      renderFileTree(childContainer, children, level + 1);
      el.after(childContainer);
    } else {
      el.classList.remove('expanded');
      el.classList.add('collapsed');
      const next = el.nextElementSibling;
      if (next && next.classList.contains('folder-children')) {
        next.remove();
      }
    }
  });
  
  el.addEventListener('contextmenu', (e) => showFileContextMenu(e, folder));
  
  return el;
}

// Crear elemento archivo
function createFileElement(file, level) {
  const el = document.createElement('div');
  el.className = 'file-item';
  el.style.paddingLeft = `${level * 12 + 8}px`;
  el.innerHTML = `<span>📄</span><span>${file.name}</span>`;
  el.dataset.path = file.path;
  
  //el.addEventListener('click', () => openFile(file));
  el.addEventListener('click', async () => await attemptOpenFile(file));
  el.addEventListener('contextmenu', (e) => showFileContextMenu(e, file));
  
  return el;
}

// Abrir archivo
// Intentar abrir archivo (con verificación de cambios)
async function attemptOpenFile(file) {
  // Si hay cambios sin guardar, mostrar modal
  if (state.hasUnsavedChanges && state.currentFile !== file.path) {
    state.pendingFile = file;
    openModal('modal-unsaved');
    return;
  }
  
  // Si no hay cambios, abrir directamente
  await openFile(file);
}

// Abrir archivo (función interna)
async function openFile(file) {
  // const result = await window.electronAPI.readFile(file.path);
  // const content = result.success ? result.content : '';
  
  // state.currentFile = file.path;
  // state.currentFileContent = content;
  // state.hasUnsavedChanges = false;
  
  // document.getElementById('editor').value = content;
  // document.getElementById('file-indicator').textContent = file.name;
  
  // // Resaltar archivo activo
  // document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
  // document.querySelectorAll(`.file-item[data-path="${file.path}"]`).forEach(el => {
  //   el.classList.add('active');
  // });
  
  // Abrir en sistema de pestañas
  openTab(file);
}



// Continuar abriendo el archivo pendiente (desde modal)
async function openPendingFile() {
  if (state.pendingFile) {
    await openFile(state.pendingFile);
    state.pendingFile = null;
  }
}

// Mostrar menú contextual de archivos
function showFileContextMenu(e, item) {
  e.preventDefault();
  e.stopPropagation();
  
  const menu = document.getElementById('file-context-menu');
  menu.style.left = e.pageX + 'px';
  menu.style.top = e.pageY + 'px';
  menu.classList.remove('hidden');
  
  state.itemToRename = item;
  
  // Mostrar/ocultar "Nuevo archivo aquí" solo para carpetas
  const newFileBtn = menu.querySelector('[data-action="new-file-here"]');
  if (newFileBtn) {
    if (item.isDirectory) {
      newFileBtn.style.display = 'flex';
    } else {
      newFileBtn.style.display = 'none';
    }
  }
}

// Ocultar menús contextuales
function hideContextMenu() {
  document.getElementById('context-menu').classList.add('hidden');
  document.getElementById('file-context-menu').classList.add('hidden');
}

// Crear carpeta
async function createFolder() {
  const name = document.getElementById('input-folder-name').value.trim();
  if (!name) return;
  
  if (!state.projectPath) {
    document.getElementById('folder-error').textContent = 'No hay proyecto abierto';
    document.getElementById('folder-error').classList.remove('hidden');
    return;
  }
  
  const result = await window.electronAPI.createFolder(state.projectPath, name);
  if (result.success) {
    closeModal('modal-folder');
    document.getElementById('input-folder-name').value = '';
    loadProject(state.projectPath);
  } else {
    document.getElementById('folder-error').textContent = result.error;
    document.getElementById('folder-error').classList.remove('hidden');
  }
}

// Renombrar elemento
async function confirmRename() {
  if (!state.itemToRename) return;
  
  const newName = document.getElementById('input-rename').value.trim();
  const errorDiv = document.getElementById('rename-error');
  
  if (!newName) {
    errorDiv.textContent = 'El nombre no puede estar vacío';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  if (newName === state.itemToRename.name) {
    closeModal('modal-rename');
    return;
  }
  
  const result = await window.electronAPI.renameItem(state.itemToRename.path, newName);
  
  if (result.success) {
    closeModal('modal-rename');
    showNotification(`Renombrado a: ${newName}`);
    loadProject(state.projectPath);
    state.itemToRename = null;
  } else {
    errorDiv.textContent = result.error || 'Error al renombrar';
    errorDiv.classList.remove('hidden');
  }
}

// Borrar elemento
async function confirmDelete() {
  if (!state.itemToRename) return;
  
  const result = await window.electronAPI.deleteItem(state.itemToRename.path);
  
  if (result.success) {
    closeModal('modal-delete');
    showNotification('Elemento borrado');
    
    // Si es el archivo actual, limpiar editor
    if (state.currentFile === state.itemToRename.path) {
      state.currentFile = null;
      state.currentFileContent = '';
      document.getElementById('editor').value = '';
      document.getElementById('file-name').textContent = 'Sin archivo';
    }
    
    loadProject(state.projectPath);
    state.itemToRename = null;
  } else {
    alert(`Error al borrar: ${result.error}`);
  }
}

// Configurar listeners del sidebar
function setupFileSystemListeners() {
  document.getElementById('btn-open').addEventListener('click', async () => {
    const result = await window.electronAPI.openFolderDialog();
    if (result.success) loadProject(result.path);
  });
  
  document.getElementById('btn-open-empty').addEventListener('click', async () => {
    const result = await window.electronAPI.openFolderDialog();
    if (result.success) loadProject(result.path);
  });
  
  document.getElementById('btn-new-folder').addEventListener('click', () => openModal('modal-folder'));
  
  // Menú contextual de archivos
  document.getElementById('file-context-menu').querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      hideContextMenu();
      
      if (action === 'new-file-here') {
        openNewFileInFolderModal();
      } else if (action === 'rename') {
        openRenameModal();
      } else if (action === 'move') {
        openMoveModal();
      } else if (action === 'delete') {
        openDeleteModal();
      } else if (action === 'open-split') {
        openInSplit(state.itemToRename);
      }
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadProject, openFile, openPendingFile, createFolder, confirmRename, confirmDelete, setupFileSystemListeners };
}
