// === SISTEMA DE ARCHIVOS ===

//const { state } = require("./state");

// Cargar proyecto
async function loadProject(path) {
  state.projectPath = path;
  
  // Cargar o crear proyecto JSON
  await loadOrCreateProject(path);

  // Leer directorio
  
  const items = await window.electronAPI.readDirectory(state.projectRootPath);
  
  // Filtrar según proyecto
  const filteredItems = filterTreeByProject(items);
  
  // Obtener contenedor del árbol
  const fileTree = document.getElementById('file-tree');
  
  // Renderizar
  renderFileTree(fileTree, filteredItems, 0);
}

// === DRAG AND DROP ===

let currentDragOverEl = null;

function clearDragOver() {
  if (currentDragOverEl) {
    currentDragOverEl.classList.remove('drag-over');
    currentDragOverEl = null;
  }
}

async function handleFileDrop(dragData, destFolderPath) {
  const { path: sourcePath, name: sourceName, isDirectory } = dragData;

  // No-op: misma carpeta padre
  const sourceParent = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
  if (sourceParent === destFolderPath) return;

  // Evitar mover una carpeta dentro de sí misma o de un descendiente
  if (isDirectory && (destFolderPath === sourcePath || destFolderPath.startsWith(sourcePath + '/'))) {
    showErrorNotification('No se puede mover una carpeta dentro de sí misma');
    return;
  }

  // Verificar conflicto de nombre en destino ANTES de mover
  let destItems;
  try {
    destItems = await window.electronAPI.readDirectory(destFolderPath);
  } catch {
    showErrorNotification('No se pudo leer la carpeta destino');
    return;
  }

  if (destItems.some(item => item.name === sourceName)) {
    showErrorNotification(`"${sourceName}" ya existe en la carpeta destino`);
    return;
  }

  // Mover
  const result = await window.electronAPI.moveItem(sourcePath, destFolderPath);
  if (result.success) {
    if (state.currentFile === sourcePath) state.currentFile = result.path;
    showNotification(`Movido: ${sourceName}`);
    await reloadPreservingExpanded();
  } else {
    showErrorNotification(`Error al mover: ${result.error || 'desconocido'}`);
  }
}

function addDragSource(el, item) {
  el.setAttribute('draggable', 'true');

  el.addEventListener('dragstart', (e) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/trw-item', JSON.stringify({
      path: item.path,
      name: item.name,
      isDirectory: !!item.isDirectory
    }));
    // Pequeño delay para que el snapshot del drag image se tome antes de aplicar opacidad
    setTimeout(() => el.classList.add('dragging'), 0);
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    clearDragOver();
  });
}

function addDropTarget(el, folderPath) {
  el.addEventListener('dragover', (e) => {
    if (!e.dataTransfer.types.includes('application/trw-item')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (currentDragOverEl !== el) {
      clearDragOver();
      currentDragOverEl = el;
      el.classList.add('drag-over');
    }
  });

  el.addEventListener('dragleave', (e) => {
    if (!el.contains(e.relatedTarget)) {
      el.classList.remove('drag-over');
      if (currentDragOverEl === el) currentDragOverEl = null;
    }
  });

  el.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.remove('drag-over');
    if (currentDragOverEl === el) currentDragOverEl = null;

    const raw = e.dataTransfer.getData('application/trw-item');
    if (!raw) return;
    try {
      await handleFileDrop(JSON.parse(raw), folderPath);
    } catch {
      showErrorNotification('Error inesperado al mover');
    }
  });
}

// === PRESERVACIÓN DE ESTADO DE EXPANSIÓN ===

// Devuelve las rutas de todas las carpetas actualmente expandidas
function getExpandedPaths() {
  return Array.from(document.querySelectorAll('.folder-item.expanded'))
    .map(el => el.dataset.path);
}

// Expande programáticamente una carpeta por su ruta (si ya está en el DOM)
async function expandFolderByPath(folderPath) {
  const folderEl = document.querySelector(`.folder-item[data-path="${CSS.escape(folderPath)}"]`);
  if (!folderEl || folderEl.classList.contains('expanded')) return;

  const paddingLeft = parseInt(folderEl.style.paddingLeft) || 8;
  const level = Math.round((paddingLeft - 8) / 12);

  folderEl.classList.remove('collapsed');
  folderEl.classList.add('expanded');

  const children = await window.electronAPI.readDirectory(folderPath);
  const childContainer = document.createElement('div');
  childContainer.className = 'folder-children';
  renderFileTree(childContainer, children, level + 1);
  folderEl.after(childContainer);
}

// Recarga el proyecto preservando las carpetas expandidas.
// Si se ha renombrado una carpeta, pasa renamedFrom/renamedTo para actualizar las rutas.
async function reloadPreservingExpanded(renamedFrom = null, renamedTo = null) {
  let expandedPaths = getExpandedPaths();

  if (renamedFrom && renamedTo) {
    expandedPaths = expandedPaths.map(p => {
      if (p === renamedFrom) return renamedTo;
      if (p.startsWith(renamedFrom + '/')) return renamedTo + p.slice(renamedFrom.length);
      return p;
    });
  }

  // Expandir de más superficial a más profundo (los padres deben existir en el DOM antes que los hijos)
  expandedPaths.sort((a, b) => a.split('/').length - b.split('/').length);

  await loadProject(state.projectPath);

  for (const path of expandedPaths) {
    await expandFolderByPath(path);
  }
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

  // Obtener tipo de directorio (si está marcado)
  const tipo = getDirectoryTypeFromPath(folder.path);
  let badgeHTML = '';

  // Si está marcado, agregar badge
  if (tipo) {
    const badge = getTypeBadge(tipo);
    badgeHTML = `<span class="dir-badge" style="color: ${badge.color}" title="${tipo}">${badge.icon}</span>`;
  }else {
    badgeHTML = '';
  }

  el.innerHTML = `<span class="folder-icon">${badgeHTML}</span><span>${folder.name}</span>`;
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

    // Mostrar metadatos del capítulo automáticamente al hacer clic
    if (isChapterFolder(folder.path)) {
      openChapterMetadataPanel(folder);
    }
  });

  el.addEventListener('contextmenu', (e) => showFileContextMenu(e, folder));

  addDragSource(el, folder);
  addDropTarget(el, folder.path);

  return el;
}

// Crear elemento archivo
function createFileElement(file, level) {
  const el = document.createElement('div');
  el.className = 'file-item';
  el.style.paddingLeft = `${level * 12 + 8}px`;

  let iconHtml;
  if (isTramaFile(file.path)) {
    const meta = state.projectData?.metadatosTramas?.[file.path];
    const icon = getTramaEstadoIcon(meta?.estado || 'pendiente');
    const label = getTramaEstadoLabel(meta?.estado || 'pendiente');
    iconHtml = `<span class="trama-estado-icon" title="${label}">${icon}</span>`;
  } else {
    iconHtml = `<span>📄</span>`;
  }

  el.innerHTML = `${iconHtml}<span>${file.name}</span>`;
  el.dataset.path = file.path;
  
  el.addEventListener('click', async () => await attemptOpenFile(file));
  el.addEventListener('contextmenu', (e) => showFileContextMenu(e, file));

  addDragSource(el, file);

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

  // Mostrar metadatos automáticamente según tipo de fichero
  const capitulosRuta = state.projectData?.configuracion?.directorios?.capitulos?.ruta;
  const fileIsScene = !file.isDirectory && capitulosRuta && (() => {
    const parent = file.path.substring(0, file.path.lastIndexOf('/'));
    const grandparent = parent.substring(0, parent.lastIndexOf('/'));
    return grandparent === capitulosRuta;
  })();

  if (fileIsScene) {
    openSceneMetadataPanel(file);
  } else if (isTramaFile(file.path)) {
    openTramaMetadataPanel(file);
  }
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

  // Mostrar/ocultar botones solo para carpetas / solo para archivos
  const isCapitulos = item.isDirectory && getDirectoryTypeFromPath(item.path) === 'capitulos';

  // Detectar si es una carpeta de capítulo (hija directa del directorio capitulos)
  const capitulosRuta = state.projectData?.configuracion?.directorios?.capitulos?.ruta;
  const isChapterFolder = item.isDirectory && capitulosRuta &&
    item.path.substring(0, item.path.lastIndexOf('/')) === capitulosRuta;

  // Detectar si es un fichero de escena (archivo dentro de una carpeta de capítulo)
  const isSceneFile = !item.isDirectory && capitulosRuta && (() => {
    const parent = item.path.substring(0, item.path.lastIndexOf('/'));
    const grandparent = parent.substring(0, parent.lastIndexOf('/'));
    return grandparent === capitulosRuta;
  })();

  const newChapterBtn = menu.querySelector('[data-action="new-chapter"]');
  if (newChapterBtn) {
    newChapterBtn.style.display = isCapitulos ? 'flex' : 'none';
  }
  const newFolderHereBtn = menu.querySelector('[data-action="new-folder-here"]');
  if (newFolderHereBtn) {
    newFolderHereBtn.style.display = item.isDirectory ? 'flex' : 'none';
  }
  const newFileBtn = menu.querySelector('[data-action="new-file-here"]');
  if (newFileBtn) {
    newFileBtn.style.display = item.isDirectory ? 'flex' : 'none';
  }
  const exportBtn = menu.querySelector('[data-action="export-docx"]');
  if (exportBtn) {
    exportBtn.style.display = item.isDirectory ? 'flex' : 'none';
  }
  // "Abrir en split derecho" solo para archivos, nunca para carpetas de capítulo
  const openSplitBtn = menu.querySelector('[data-action="open-split"]');
  if (openSplitBtn) {
    openSplitBtn.style.display = (!item.isDirectory) ? 'flex' : 'none';
  }
  // "Metadatos" para carpetas de capítulo, ficheros de escena y ficheros de trama
  const isTramaFileItem = !item.isDirectory && isTramaFile(item.path);
  const openMetadataBtn = menu.querySelector('[data-action="open-metadata"]');
  if (openMetadataBtn) {
    openMetadataBtn.style.display = (isChapterFolder || isSceneFile || isTramaFileItem) ? 'flex' : 'none';
  }
  // "Estadísticas del capítulo" solo para carpetas de capítulo
  const chapterStatsBtn = menu.querySelector('[data-action="chapter-stats"]');
  if (chapterStatsBtn) {
    chapterStatsBtn.style.display = isChapterFolder ? 'flex' : 'none';
  }
  // Actualizar opciones de marcado si es directorio
  if (item.isDirectory) {
    updateContextMenuForDirectory(item.path);
  } else {
    document.getElementById('menu-mark-section').style.display = 'none';
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

  const targetFolder = (state.itemToRename && state.itemToRename.isDirectory)
    ? state.itemToRename.path
    : (state.projectRootPath || state.projectPath);

  if (!targetFolder) {
    document.getElementById('folder-error').textContent = 'No hay proyecto abierto';
    document.getElementById('folder-error').classList.remove('hidden');
    return;
  }

  const result = await window.electronAPI.createFolder(targetFolder, name);
  if (result.success) {
    closeModal('modal-folder');
    document.getElementById('input-folder-name').value = '';
    await reloadPreservingExpanded();
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
    const wasDirectory = state.itemToRename.isDirectory;
    const oldPath = state.itemToRename.path;
    const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = parentDir + '/' + newName;

    closeModal('modal-rename');
    showNotification(`Renombrado a: ${newName}`);
    state.itemToRename = null;

    // Para carpetas, sustituir rutas expandidas afectadas (path cascade)
    await reloadPreservingExpanded(wasDirectory ? oldPath : null, wasDirectory ? newPath : null);
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

    state.itemToRename = null;
    await reloadPreservingExpanded();
  } else {
    alert(`Error al borrar: ${result.error}`);
  }
}

// === RESIZE DEL SIDEBAR ===

function setupSidebarResize() {
  const resizer = document.getElementById('sidebar-resizer');
  const sidebar = document.getElementById('sidebar');
  const MIN_WIDTH = 250;

  // Restaurar ancho guardado
  const saved = parseInt(localStorage.getItem('sidebarWidth'));
  if (saved && saved >= MIN_WIDTH) {
    sidebar.style.width = saved + 'px';
  }

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX     = e.clientX;
    const startWidth = sidebar.offsetWidth;

    resizer.classList.add('resizing');
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(e) {
      const newWidth = Math.max(MIN_WIDTH, startWidth + (e.clientX - startX));
      sidebar.style.width = newWidth + 'px';
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
      resizer.classList.remove('resizing');
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      localStorage.setItem('sidebarWidth', sidebar.offsetWidth);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  });
}

// Configurar listeners del sidebar
function setupFileSystemListeners() {
  setupSidebarResize();
  document.getElementById('btn-open-empty').addEventListener('click', async () => {
    const result = await window.electronAPI.openFolderDialog();
    if (result.success) loadProject(result.path);
  });

  
  // Menú contextual de archivos
  document.getElementById('file-context-menu').querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      hideContextMenu();
      
      if (action === 'new-chapter') {
        openNewChapterModal();
      } else if (action === 'new-folder-here') {
        openModal('modal-folder');
      } else if (action === 'new-file-here') {
        openNewFileInFolderModal();
      } else if (action === 'rename') {
        openRenameModal();
      } else if (action === 'delete') {
        openDeleteModal();
      } else if (action === 'open-split') {
        openInSplit(state.itemToRename);
      } else if (action === 'open-metadata') {
        if (state.itemToRename.isDirectory) {
          openChapterMetadataPanel(state.itemToRename);
        } else if (isTramaFile(state.itemToRename.path)) {
          openTramaMetadataPanel(state.itemToRename);
        } else {
          openSceneMetadataPanel(state.itemToRename);
        }
      } else if (action === 'export-docx') {
        exportFolderToDocx(state.itemToRename.path);
      } else if (action === 'unmark') {
        if (state.itemToRename?.path) {
          unmarkDirectory(state.itemToRename.path);
        }
      } else if (action === 'chapter-stats') {
        if (state.itemToRename?.path) {
          openChapterStats(state.itemToRename.path);
        }
      }
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadProject, openFile, openPendingFile, createFolder, confirmRename, confirmDelete, setupFileSystemListeners };
}
