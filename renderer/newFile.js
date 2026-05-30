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

    const fileToOpen = { name: fileName, path: result.path };
    state.itemToRename = null;

    // Recargar preservando carpetas expandidas y abrir el nuevo archivo
    await reloadPreservingExpanded();
    await openFile(fileToOpen);
  } else {
    errorDiv.textContent = result.error || 'Error al crear archivo';
    errorDiv.classList.remove('hidden');
  }
}

// === NUEVA ESCENA ===

function openNewSceneModal() {
  if (!state.itemToRename || !state.itemToRename.isDirectory) return;
  document.getElementById('input-scene-name').value = '';
  document.getElementById('scene-error').classList.add('hidden');
  openModal('modal-new-scene');
  setTimeout(() => document.getElementById('input-scene-name').focus(), 100);
}

async function createNewScene() {
  const rawName = document.getElementById('input-scene-name').value.trim();
  const errorDiv = document.getElementById('scene-error');

  if (!rawName) {
    errorDiv.textContent = 'El nombre no puede estar vacío';
    errorDiv.classList.remove('hidden');
    return;
  }

  const fileName = rawName.endsWith('.txt') ? rawName : rawName + '.txt';

  const targetFolder = (state.itemToRename && state.itemToRename.isDirectory)
    ? state.itemToRename.path
    : state.projectPath;

  if (!targetFolder) {
    errorDiv.textContent = 'No hay carpeta de destino';
    errorDiv.classList.remove('hidden');
    return;
  }

  const result = await window.electronAPI.createFile(targetFolder, fileName);

  if (result.success) {
    closeModal('modal-new-scene');
    document.getElementById('input-scene-name').value = '';
    errorDiv.classList.add('hidden');

    const folderName = state.itemToRename ? state.itemToRename.name : 'raíz';
    showNotification(`Escena creada en ${folderName}: ${fileName}`);

    const fileToOpen = { name: fileName, path: result.path };
    state.itemToRename = null;

    await reloadPreservingExpanded();
    await openFile(fileToOpen);
  } else {
    errorDiv.textContent = result.error || 'Error al crear la escena';
    errorDiv.classList.remove('hidden');
  }
}

// === NUEVO CAPÍTULO ===

async function openNewChapterModal() {
  const capitulosPath = state.projectData?.configuracion?.directorios?.capitulos?.ruta;
  if (!capitulosPath) return;

  // Sugerir el siguiente número de capítulo
  const items = await window.electronAPI.readDirectory(capitulosPath);
  const count = items.filter(i => i.isDirectory).length;
  const suggested = `Capítulo ${count + 1}`;

  const input = document.getElementById('input-chapter-name');
  input.value = suggested;
  document.getElementById('chapter-error').classList.add('hidden');

  openModal('modal-new-chapter');
  setTimeout(() => { input.focus(); input.select(); }, 100);
}

async function createChapter() {
  const name = document.getElementById('input-chapter-name').value.trim();
  const errorDiv = document.getElementById('chapter-error');

  if (!name) {
    errorDiv.textContent = 'El nombre no puede estar vacío';
    errorDiv.classList.remove('hidden');
    return;
  }

  const capitulosPath = state.projectData?.configuracion?.directorios?.capitulos?.ruta;
  if (!capitulosPath) return;

  const result = await window.electronAPI.createFolder(capitulosPath, name);

  if (result.success) {
    closeModal('modal-new-chapter');
    document.getElementById('input-chapter-name').value = '';
    showNotification(`Capítulo creado: ${name}`);
    await reloadPreservingExpanded();
  } else {
    errorDiv.textContent = result.error || 'Error al crear el capítulo';
    errorDiv.classList.remove('hidden');
  }
}

// Configurar listeners de nuevo archivo
function setupNewFileListeners() {
  document.getElementById('btn-new-file')?.addEventListener('click', () => {
    openModal('modal-new-file');
  });

  document.getElementById('btn-confirm-new-file').addEventListener('click', createNewFile);

  // Enter en input
  document.getElementById('input-file-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createNewFile();
  });

  document.getElementById('btn-confirm-new-chapter').addEventListener('click', createChapter);

  document.getElementById('input-chapter-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createChapter();
  });

  document.getElementById('btn-confirm-new-scene').addEventListener('click', createNewScene);

  document.getElementById('input-scene-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createNewScene();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createNewFile,
    setupNewFileListeners,
    openNewFileInFolderModal,
    openNewChapterModal,
    createChapter,
    openNewSceneModal,
    createNewScene
  };
}
