// ====================================
// PROJECT MANAGER
// Gestión de proyectos JSON
// ====================================

// === UTILIDADES ===

// Obtener badge según tipo
function getTypeBadge(tipo) {
  const badges = {
    capitulos: { icon: '📚', color: '#4a9eff' },
    personajes: { icon: '👤', color: '#4ade80' },
    tramas: { icon: '🎭', color: '#a855f7' },
    mundo: { icon: '🌍', color: '#fb923c' },
    papelera: { icon: '🗑️', color: '#ef4444' },
    otro: { icon: '📂', color: '#94a3b8' }
  };
  return badges[tipo] || badges.otro;
}

// Verificar si hay directorios marcados
function hasMarkedDirectories() {
  if (!state.projectData) return false;
  
  const dirs = state.projectData.configuracion.directorios;
  
  // Verificar tipos específicos
  const tipos = ['capitulos', 'personajes', 'tramas', 'mundo', 'papelera'];
  for (const tipo of tipos) {
    if (dirs[tipo]?.ruta && dirs[tipo].ruta !== '') {
      return true;
    }
  }
  
  // Verificar otros
  if (dirs.otros && dirs.otros.length > 0) {
    return true;
  }
  
  return false;
}

// === CARGA DE PROYECTO ===

// Cargar o crear proyecto
async function loadOrCreateProject(dirPath) {
  const result = await window.electronAPI.loadOrCreateProject(dirPath);
  console.log('Resultado de loadOrCreateProject:', result);

  if (dirPath.endsWith('.json')) {
    //Si termina en .json, es un fichero, ajustar la ruta raíz del proyecto
    dirPath = dirPath.substring(0, dirPath.lastIndexOf('/'));
    state.projectRootPath = dirPath;
    state.projectMode = 'json';
  }else{
    state.projectMode = 'folder';
  }


  if (result.success) {
    state.projectJsonPath = result.path;
    state.projectData = result.data;
    state.projectRootPath = dirPath;
    state.hasMarkedDirs = hasMarkedDirectories();
    
    if (state.projectMode === 'json') {
      document.getElementById('modo-fichero').style.visibility = 'visible';
      document.getElementById('modo-carpeta').style.visibility = 'hidden';
    } else {
      document.getElementById('modo-fichero').style.visibility = 'hidden';
      document.getElementById('modo-carpeta').style.visibility = 'visible';
    }
    console.log(state);
    if (!result.existed) {
      const jsonName = result.path.split('/').pop();
      showNotification(`Proyecto creado: ${jsonName}`);
    }
    
    return true;
  } else {
    showNotification('Error al cargar proyecto: ' + result.error);
    return false;
  }
}

// === FILTRADO DE ÁRBOL ===

// Filtrar árbol según directorios marcados
function filterTreeByProject(items) {
  if (!state.hasMarkedDirs) {
    return items; // Sin filtro, mostrar todo
  }

  if (state.projectMode === 'folder') {
    return items; // Modo carpeta, mostrar todo
  }
  
  const dirs = state.projectData.configuracion.directorios;
  const allowedPaths = new Set();
  
  // Recopilar rutas permitidas
  const tipos = ['capitulos', 'personajes', 'tramas', 'mundo', 'papelera'];
  tipos.forEach(tipo => {
    if (dirs[tipo]?.ruta && dirs[tipo].ruta !== '') {
      allowedPaths.add(dirs[tipo].ruta);
    }
  });
  
  // Agregar otros
  if (dirs.otros) {
    dirs.otros.forEach(otro => {
      if (otro.mostrar && otro.ruta !== '') {
        allowedPaths.add(otro.ruta);
      }
    });
  }
  
  // Filtrar items
  return items.filter(item => allowedPaths.has(item.path));
}

// Obtener tipo de directorio
function getDirectoryTypeFromPath(dirPath) {
  if (!state.projectData) return null;
  
  const dirs = state.projectData.configuracion.directorios;
  
  // Buscar en tipos específicos
  const tipos = ['capitulos', 'personajes', 'tramas', 'mundo', 'papelera'];
  for (const tipo of tipos) {
    if (dirs[tipo]?.ruta === dirPath) {
      return tipo;
    }
  }
  
  // Buscar en otros
  if (dirs.otros) {
    const found = dirs.otros.find(d => d.ruta === dirPath);
    if (found) return 'otro';
  }
  
  return null;
}

// === MARCADO DE DIRECTORIOS ===

// Marcar directorio
async function markDirectory(dirPath, tipo) {
  if (!state.projectJsonPath) {
    showNotification('No hay proyecto cargado');
    return;
  }
  
  const result = await window.electronAPI.markDirectory(
    state.projectJsonPath,
    dirPath,
    tipo
  );
  
  if (result.success) {
    state.projectData = result.data;
    state.hasMarkedDirs = hasMarkedDirectories();
    
    const badge = getTypeBadge(tipo);
    showNotification(`Marcado como: ${badge.icon} ${tipo}`);
    
    // Recargar árbol
    await loadProject(state.projectRootPath);
  } else {
    showNotification('Error al marcar directorio: ' + result.error);
  }
}

// Desmarcar directorio
async function unmarkDirectory(dirPath) {
  if (!state.projectJsonPath) {
    showNotification('No hay proyecto cargado');
    return;
  }
  
  const result = await window.electronAPI.unmarkDirectory(
    state.projectJsonPath,
    dirPath
  );
  
  if (result.success) {
    state.projectData = result.data;
    state.hasMarkedDirs = hasMarkedDirectories();
    
    showNotification('Directorio desmarcado');
    
    // Recargar árbol
    await loadProject(state.projectRootPath);
  } else {
    showNotification('Error al desmarcar: ' + result.error);
  }
}

// === MODAL DE METADATOS ===

// Abrir modal de metadatos
function openProjectMetadataModal() {
  if (!state.projectData) {
    showNotification('No hay proyecto cargado');
    return;
  }
  
  // Cargar valores actuales
  const proyecto = state.projectData.proyecto;
  document.getElementById('project-title').value = proyecto.titulo || '';
  document.getElementById('project-author').value = proyecto.autor || '';
  document.getElementById('project-date').value = proyecto.fecha || '';
  document.getElementById('project-saga').value = proyecto.saga || '';
  document.getElementById('project-deadline').value = proyecto.fechaPrevista || '';

  const coverPath = proyecto.rutaPortada || '';
  document.getElementById('project-cover').value = coverPath;
  updateCoverPreview(coverPath);

  const errorDiv = document.getElementById('project-metadata-error');
  errorDiv.classList.add('hidden');
  
  openModal('modal-project-metadata');
}

// Guardar metadatos
async function saveProjectMetadata() {
  if (!state.projectData || !state.projectJsonPath) return;
  
  // Actualizar datos
  state.projectData.proyecto.titulo = document.getElementById('project-title').value;
  state.projectData.proyecto.autor = document.getElementById('project-author').value;
  state.projectData.proyecto.fecha = document.getElementById('project-date').value;
  state.projectData.proyecto.saga = document.getElementById('project-saga').value;
  state.projectData.proyecto.fechaPrevista = document.getElementById('project-deadline').value;
  state.projectData.proyecto.rutaPortada = document.getElementById('project-cover').value;
  
  // Guardar JSON
  const result = await window.electronAPI.saveProjectJson(
    state.projectJsonPath,
    state.projectData
  );
  
  if (result.success) {
    closeModal('modal-project-metadata');
    showNotification('Metadatos guardados');
  } else {
    const errorDiv = document.getElementById('project-metadata-error');
    errorDiv.textContent = 'Error al guardar: ' + result.error;
    errorDiv.classList.remove('hidden');
  }
}

// === MENÚ CONTEXTUAL ===

// Mostrar/ocultar opción de desmarcar
async function updateContextMenuForDirectory(dirPath) {
  const markSection = document.getElementById('menu-mark-section');
  const unmarkBtn = markSection.querySelector('[data-action="unmark"]');
  
  if (!state.projectJsonPath) {
    markSection.style.display = 'none';
    return;
  }
  
  markSection.style.display = 'block';
  
  // Verificar si está marcado
  const tipo = getDirectoryTypeFromPath(dirPath);
  
  if (tipo) {
    unmarkBtn.style.display = 'block';
  } else {
    unmarkBtn.style.display = 'none';
  }
}

// Manejar submenú de marcado
function setupMarkSubmenu() {
  const markButton = document.querySelector('[data-action="mark-as"]');
  const submenu = document.getElementById('mark-submenu');
  const contextMenu = document.getElementById('file-context-menu');
  
  if (!markButton || !submenu) return;
  
  let hideTimeout = null;
  
  // Mostrar submenú al entrar en el botón
  markButton.addEventListener('mouseenter', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    
    const rect = markButton.getBoundingClientRect();
    submenu.style.left = rect.right + 'px';
    submenu.style.top = rect.top + 'px';
    submenu.classList.remove('hidden');
  });
  
  // Ocultar submenú al salir del botón (con delay)
  markButton.addEventListener('mouseleave', () => {
    hideTimeout = setTimeout(() => {
      submenu.classList.add('hidden');
    }, 300);
  });
  
  // Cancelar ocultación al entrar en el submenú
  submenu.addEventListener('mouseenter', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });
  
  // Ocultar al salir del submenú
  submenu.addEventListener('mouseleave', () => {
    submenu.classList.add('hidden');
  });
  
  // Ocultar ambos menús al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target) && !submenu.contains(e.target)) {
      contextMenu.classList.add('hidden');
      submenu.classList.add('hidden');
    }
  });
}

// === LISTENERS ===

function updateCoverPreview(filePath) {
  const wrap = document.getElementById('cover-preview-wrap');
  const img = document.getElementById('cover-preview');
  if (filePath) {
    img.src = `file://${filePath}`;
    wrap.classList.remove('hidden');
  } else {
    img.src = '';
    wrap.classList.add('hidden');
  }
}

function setupProjectListeners() {
  // Botón de metadatos
  document.getElementById('btn-project-metadata')?.addEventListener('click', openProjectMetadataModal);

  // Guardar metadatos
  document.getElementById('btn-save-metadata')?.addEventListener('click', saveProjectMetadata);

  // Selector de portada
  document.getElementById('btn-select-cover')?.addEventListener('click', async () => {
    const result = await window.electronAPI.openImageDialog();
    if (result.success) {
      document.getElementById('project-cover').value = result.path;
      updateCoverPreview(result.path);
    }
  });
  
  // Submenú de marcado
  setupMarkSubmenu();
  
  // Opciones de tipo en submenú
  document.querySelectorAll('#mark-submenu .menu-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tipo = btn.dataset.type;
      if (state.itemToRename?.path && state.itemToRename?.isDirectory) {
        await markDirectory(state.itemToRename.path, tipo);
        document.getElementById('file-context-menu').classList.add('hidden');
        document.getElementById('mark-submenu').classList.add('hidden');
      }
    });
  });
}

// === ESTADÍSTICAS DE CAPÍTULO ===

function isChapterFolder(folderPath) {
  if (!state.projectData) return false;
  const capitulosRuta = state.projectData.configuracion.directorios.capitulos?.ruta;
  if (!capitulosRuta) return false;
  const parentPath = folderPath.substring(0, folderPath.lastIndexOf('/'));
  return parentPath === capitulosRuta;
}

async function openChapterStats(folderPath) {
  const cached = state.projectData?.configuracion?.estadisticas?.capitulos?.[folderPath];
  if (cached) {
    showChapterStatsModal(folderPath, cached);
  } else {
    await calculateAndShowChapterStats(folderPath);
  }
}

async function calculateAndShowChapterStats(folderPath) {
  const result = await window.electronAPI.calculateChapterStats(folderPath);
  if (!result.success) {
    showNotification('Error al calcular estadísticas: ' + result.error);
    return;
  }

  const stats = {
    escenas: result.scenes,
    palabras: result.totalWords,
    mediaEscena: result.avgWordsPerScene,
    calculado: new Date().toISOString().split('T')[0]
  };

  if (state.projectData && state.projectJsonPath) {
    if (!state.projectData.configuracion.estadisticas) {
      state.projectData.configuracion.estadisticas = {};
    }
    if (!state.projectData.configuracion.estadisticas.capitulos) {
      state.projectData.configuracion.estadisticas.capitulos = {};
    }
    state.projectData.configuracion.estadisticas.capitulos[folderPath] = stats;
    await window.electronAPI.saveProjectJson(state.projectJsonPath, state.projectData);
  }

  showChapterStatsModal(folderPath, stats);
}

function showChapterStatsModal(folderPath, stats) {
  const name = folderPath.split('/').pop();
  document.getElementById('chapter-stats-name').textContent = name;
  document.getElementById('chapter-stat-scenes').textContent = stats.escenas;
  document.getElementById('chapter-stat-words').textContent = stats.palabras.toLocaleString('es-ES');
  document.getElementById('chapter-stat-avg').textContent = stats.mediaEscena.toLocaleString('es-ES');
  document.getElementById('chapter-stats-date').textContent = stats.calculado ? `Calculado el ${stats.calculado}` : '';
  document.getElementById('btn-recalculate-stats').onclick = () => calculateAndShowChapterStats(folderPath);
  openModal('modal-chapter-stats');
}

// === FRECUENCIA DE PALABRAS ===

let _wordFreqData = [];  // caché en memoria para filtrado rápido

async function openWordFreqModal(folderPath) {
  const cached = state.projectData?.configuracion?.estadisticas?.capitulos?.[folderPath]?.frecuenciaPalabras;
  if (cached && cached.length > 0) {
    showWordFreqModal(folderPath, cached);
  } else {
    await calculateAndShowWordFreq(folderPath);
  }
}

async function calculateAndShowWordFreq(folderPath) {
  document.getElementById('word-freq-summary').textContent = 'Calculando…';
  openModal('modal-word-freq');
  document.getElementById('word-freq-chapter-name').textContent = folderPath.split('/').pop();

  const settings = await window.electronAPI.getAppSettings();
  const minLetters = settings.wordFreqMinLetters ?? 4;

  const result = await window.electronAPI.calculateWordFrequency(folderPath, minLetters);
  if (!result.success) {
    document.getElementById('word-freq-summary').textContent = 'Error: ' + result.error;
    return;
  }

  if (state.projectData && state.projectJsonPath) {
    if (!state.projectData.configuracion.estadisticas) state.projectData.configuracion.estadisticas = {};
    if (!state.projectData.configuracion.estadisticas.capitulos) state.projectData.configuracion.estadisticas.capitulos = {};
    if (!state.projectData.configuracion.estadisticas.capitulos[folderPath]) state.projectData.configuracion.estadisticas.capitulos[folderPath] = {};
    state.projectData.configuracion.estadisticas.capitulos[folderPath].frecuenciaPalabras = result.words;
    state.projectData.configuracion.estadisticas.capitulos[folderPath].frecuenciaCalculado = new Date().toISOString().split('T')[0];
    state.projectData.configuracion.estadisticas.capitulos[folderPath].frecuenciaMinLetras = minLetters;
    await window.electronAPI.saveProjectJson(state.projectJsonPath, state.projectData);
  }

  showWordFreqModal(folderPath, result.words);
}

function showWordFreqModal(folderPath, words) {
  const name = folderPath.split('/').pop();
  document.getElementById('word-freq-chapter-name').textContent = name;
  _wordFreqData = words;

  const fecha = state.projectData?.configuracion?.estadisticas?.capitulos?.[folderPath]?.frecuenciaCalculado;
  document.getElementById('word-freq-date').textContent = fecha ? `Calculado el ${fecha}` : '';
  document.getElementById('btn-recalculate-word-freq').onclick = () => calculateAndShowWordFreq(folderPath);

  const minInput = document.getElementById('word-freq-min');
  const searchInput = document.getElementById('word-freq-search');
  minInput.value = 2;
  searchInput.value = '';

  renderWordFreqTable(words, 2, '');

  minInput.oninput = () => renderWordFreqTable(_wordFreqData, parseInt(minInput.value) || 1, searchInput.value.trim().toLowerCase());
  searchInput.oninput = () => renderWordFreqTable(_wordFreqData, parseInt(minInput.value) || 1, searchInput.value.trim().toLowerCase());

  openModal('modal-word-freq');
}

function renderWordFreqTable(words, minCount, filter) {
  const tbody = document.getElementById('word-freq-tbody');
  const filtered = words.filter(w => w.count >= minCount && (!filter || w.word.includes(filter)));
  const max = filtered.length > 0 ? filtered[0].count : 1;

  document.getElementById('word-freq-summary').textContent =
    `${filtered.length.toLocaleString('es-ES')} palabras únicas · palabras con >${minCount - 1} apariciones`;

  tbody.innerHTML = filtered.map((w, i) => {
    const pct = Math.round((w.count / max) * 100);
    const barColor = w.count >= 10 ? 'var(--accent-color, #e07b4a)' : 'var(--text-muted)';
    return `<tr style="border-bottom:1px solid var(--border-color);">
      <td style="padding:6px 14px; color:var(--text-muted); font-size:0.8em;">${i + 1}</td>
      <td style="padding:6px 14px; color:var(--text-primary); font-weight:${w.count >= 5 ? '600' : '400'};">${w.word}</td>
      <td style="padding:6px 14px; text-align:right; color:var(--text-primary); font-variant-numeric:tabular-nums;">${w.count}</td>
      <td style="padding:6px 14px; min-width:80px;">
        <div style="height:6px; border-radius:3px; background:var(--border-color); overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${barColor}; border-radius:3px; transition:width .2s;"></div>
        </div>
      </td>
    </tr>`;
  }).join('');

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:20px; text-align:center; color:var(--text-muted);">Sin resultados</td></tr>`;
  }
}

// === CERRAR PROYECTO ===

async function closeProject() {
  // Cerrar todas las pestañas sin guardar
  state.openTabs = [];
  state.activeTabIndex = -1;
  state.currentFile = null;
  state.currentFileContent = '';
  state.hasUnsavedChanges = false;

  // Resetear datos del proyecto
  state.projectPath = null;
  state.projectJsonPath = null;
  state.projectData = null;
  state.projectRootPath = null;
  state.projectMode = 'folder';
  state.hasMarkedDirs = false;
  state.splitActive = false;
  state.splitFile = null;
  state.splitMetadataItem = null;

  // Limpiar sesión persistida
  await window.electronAPI.clearLastProject();

  // Si el mapa mental estaba activo, volver a la vista del editor
  if (typeof mmActive !== 'undefined' && mmActive) showEditorView();

  // Resetear UI
  document.getElementById('file-tree').innerHTML = `
    <div class="empty-state">
      <p>No hay proyecto abierto</p>
      <button id="btn-open-empty" class="btn-link">Abrir carpeta</button>
    </div>`;

  // Restaurar el listener del botón vacío
  document.getElementById('btn-open-empty')?.addEventListener('click', () => {
    window.electronAPI.openFolderDialog().then(result => {
      if (result?.success) loadProject(result.path);
    });
  });

  document.getElementById('tabs-container').innerHTML = '';
  document.getElementById('editor').value = '';
  document.getElementById('editor').placeholder = 'Selecciona un archivo para empezar...';
  document.getElementById('file-indicator').textContent = 'Sin archivo';
  document.getElementById('modo-fichero').style.visibility = 'hidden';
  document.getElementById('modo-carpeta').style.visibility = 'hidden';

  // Cerrar split si está abierto
  const splitPanel = document.getElementById('editor-split');
  splitPanel?.classList.add('hidden');

  showNotification('Proyecto cerrado');
}

// === EXPORTS ===

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadOrCreateProject,
    filterTreeByProject,
    getDirectoryTypeFromPath,
    markDirectory,
    unmarkDirectory,
    openProjectMetadataModal,
    saveProjectMetadata,
    updateContextMenuForDirectory,
    setupProjectListeners,
    getTypeBadge,
    isChapterFolder,
    openChapterStats,
    openWordFreqModal
  };
}
