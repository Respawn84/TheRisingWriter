// ====================================
// PROJECT MANAGER
// Gestión de proyectos JSON
// ====================================

// === RUTAS CANÓNICAS ===
//
// La app compara rutas constantemente (¿es esta la carpeta de capítulos?, ¿qué
// metadatos tiene esta escena?) y las usa como clave en project.json. Dos rutas
// que señalan al mismo fichero pueden no ser iguales para "===":
//
//  - Normalización Unicode: macOS conserva la forma con la que se creó cada
//    nombre, así que "Capítulo" puede estar compuesto (í) o descompuesto
//    (i + tilde suelta). Git convierte de una a otra al clonar en otra máquina,
//    y editar ficheros fuera de la app introduce la forma del otro editor.
//  - Separador: Windows usa "\" y el resto "/".
//
// canonPath() da una forma única con la que comparar y con la que guardar en
// project.json. NO vale para nada más: las llamadas al sistema de ficheros usan
// la ruta tal cual la devuelve readDirectory. Tanto macOS (insensible a la
// normalización) como Node en Windows (acepta "/") resuelven bien la canónica.
function canonPath(itemPath) {
  if (typeof itemPath !== 'string' || !itemPath) return '';
  const unified = itemPath.normalize('NFC').replace(/\\/g, '/');
  // Quitar la barra final, pero sin vaciar una raíz ("/" o "C:/")
  return unified.length > 1 ? unified.replace(/(?!^)\/+$/, '') : unified;
}

// ¿Dos rutas señalan al mismo sitio?
function samePath(a, b) {
  const ca = canonPath(a);
  return ca !== '' && ca === canonPath(b);
}

// ¿Dos nombres sueltos (sin ruta) son el mismo? Mismo problema de
// normalización, pero aquí no hay separadores que unificar.
function sameName(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  return a.normalize('NFC') === b.normalize('NFC');
}

// Lectura/escritura en los objetos de project.json indexados por ruta
// (metadatos, metadatosTramas, estadisticas.capitulos): siempre clave canónica.
function getByPath(container, itemPath) {
  return container ? container[canonPath(itemPath)] : undefined;
}

function setByPath(container, itemPath, value) {
  if (container) container[canonPath(itemPath)] = value;
}

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
    // Si termina en .json es un fichero: la raíz del proyecto es su carpeta.
    // parentPathOf trabaja en forma canónica, así que da igual que la ruta
    // llegue con "\" (Windows) o con "/".
    dirPath = parentPathOf(dirPath);
    state.projectRootPath = dirPath;
    state.projectMode = 'json';
  }else{
    dirPath = canonPath(dirPath);
    state.projectMode = 'folder';
  }


  if (result.success) {
    state.projectJsonPath = result.path;
    state.projectData = result.data;
    state.projectRootPath = dirPath;

    // Dejar el fichero en forma canónica antes de que nadie compare nada: así
    // sobrevive a que las rutas hayan entrado con otra normalización o con "\".
    const canonized = canonicalizeProjectData();
    if (canonized > 0) {
      console.log(`project.json: ${canonized} rutas normalizadas`);
      await window.electronAPI.saveProjectJson(state.projectJsonPath, state.projectData);
    }

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
      const jsonName = nameFromPath(result.path);
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
      allowedPaths.add(canonPath(dirs[tipo].ruta));
    }
  });

  // Agregar otros
  if (dirs.otros) {
    dirs.otros.forEach(otro => {
      if (otro.mostrar && otro.ruta !== '') {
        allowedPaths.add(canonPath(otro.ruta));
      }
    });
  }

  // Filtrar items (el Set es de rutas canónicas, así que la del disco también)
  return items.filter(item => allowedPaths.has(canonPath(item.path)));
}

// Obtener tipo de directorio
function getDirectoryTypeFromPath(dirPath) {
  if (!state.projectData) return null;
  
  const dirs = state.projectData.configuracion.directorios;
  
  // Buscar en tipos específicos
  const tipos = ['capitulos', 'personajes', 'tramas', 'mundo', 'papelera'];
  for (const tipo of tipos) {
    if (samePath(dirs[tipo]?.ruta, dirPath)) {
      return tipo;
    }
  }

  // Buscar en otros
  if (dirs.otros) {
    const found = dirs.otros.find(d => samePath(d.ruta, dirPath));
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

// === MIGRACIÓN DE RUTAS EN project.json ===
//
// project.json referencia los ficheros y carpetas del proyecto por su ruta
// absoluta: el marcado de directorios, los metadatos de capítulo y escena, las
// relaciones entre escenas, los metadatos de trama y la genealogía. Renombrar
// desde el árbol dejaba todas esas referencias apuntando a una ruta que ya no
// existe — el síntoma típico era que el panel de metadatos dejaba de abrirse
// porque directorios.capitulos.ruta señalaba a la carpeta con el nombre viejo.

// Ruta canónica del contenedor de `itemPath`. Trabaja sobre la forma canónica
// para no depender del separador del sistema (el renderer no tiene acceso al
// módulo "path" de Node).
function parentPathOf(itemPath) {
  const canon = canonPath(itemPath);
  const lastSep = canon.lastIndexOf('/');
  return lastSep <= 0 ? '' : canon.substring(0, lastSep);
}

// Nombre del fichero o carpeta, sin la ruta.
function nameFromPath(itemPath) {
  const canon = canonPath(itemPath);
  return canon.substring(canon.lastIndexOf('/') + 1);
}

// Nombre "limpio" con el que los metadatos referencian a personajes y tramas:
// sin extensión y sin el prefijo numérico de ordenación (igual que
// loadPersonajesItems / loadTramasItems en metadata.js).
function cleanItemName(itemPath) {
  return nameFromPath(itemPath).replace(/\.[^.]+$/, '').replace(/^\d+-/, '');
}

// ¿`value` es `target` o cuelga de él? Renombrar, mover o borrar una carpeta
// arrastra las rutas de todo su contenido, no solo la suya.
function pathMatches(value, target) {
  const v = canonPath(value), t = canonPath(target);
  if (!v || !t) return false;
  return v === t || v.startsWith(t + '/');
}

// Devuelve la ruta reescrita si `value` se ve afectado por el cambio; null si
// no le afecta (así se distingue "sin cambio" de "reescrito a lo mismo").
// Se corta sobre la forma canónica: normalizar puede cambiar la longitud de la
// cadena, así que trocear la original por la longitud de la vieja desalinearía.
function remapPath(value, oldPath, newPath) {
  if (!pathMatches(value, oldPath)) return null;
  return canonPath(newPath) + canonPath(value).slice(canonPath(oldPath).length);
}

// Reescribe en state.projectData todas las rutas afectadas por renombrar
// `oldPath` a `newPath`. Devuelve cuántas referencias han cambiado.
function migrateProjectPaths(oldPath, newPath) {
  const data = state.projectData;
  if (!data || !oldPath || !newPath || oldPath === newPath) return 0;

  let changed = 0;

  // Una ruta suelta guardada en un campo
  const mapField = (obj, key) => {
    if (!obj || typeof obj[key] !== 'string') return;
    const mapped = remapPath(obj[key], oldPath, newPath);
    if (mapped !== null) { obj[key] = mapped; changed++; }
  };

  // Un array de rutas
  const mapList = (obj, key) => {
    if (!obj || !Array.isArray(obj[key])) return;
    obj[key] = obj[key].map(value => {
      const mapped = remapPath(value, oldPath, newPath);
      if (mapped === null) return value;
      changed++;
      return mapped;
    });
  };

  // Un objeto {ruta: valor} — la ruta está en la clave
  const mapKeys = (obj) => {
    if (!obj) return obj;
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      const mapped = remapPath(key, oldPath, newPath);
      if (mapped !== null) changed++;
      out[mapped !== null ? mapped : key] = value;
    }
    return out;
  };

  // Directorios marcados
  const dirs = data.configuracion?.directorios;
  if (dirs) {
    ['capitulos', 'personajes', 'tramas', 'mundo', 'papelera'].forEach(tipo => {
      mapField(dirs[tipo], 'ruta');
    });
    (dirs.otros || []).forEach(otro => mapField(otro, 'ruta'));
  }

  // Orden de carpetas raíz y estadísticas cacheadas por capítulo
  mapList(data.configuracion, 'ordenCarpetas');
  if (data.configuracion?.estadisticas?.capitulos) {
    data.configuracion.estadisticas.capitulos = mapKeys(data.configuracion.estadisticas.capitulos);
  }

  // Metadatos de capítulo y escena: la clave es la ruta de la carpeta o del
  // fichero, y dentro hay más rutas de escena (posición en la trama).
  if (data.metadatos) {
    data.metadatos = mapKeys(data.metadatos);
    for (const meta of Object.values(data.metadatos)) {
      mapField(meta, 'escenaAnterior');
      mapField(meta, 'escenaSiguiente');
      mapList(meta, 'relacionesAnteriores');
      mapList(meta, 'relacionesPosteriores');
    }
  }

  // Metadatos de trama: clave = fichero de trama, dentro rutas de escena
  if (data.metadatosTramas) {
    data.metadatosTramas = mapKeys(data.metadatosTramas);
    for (const meta of Object.values(data.metadatosTramas)) {
      mapField(meta, 'escenaInicio');
      mapField(meta, 'escenaFin');
    }
  }

  // Genealogía: cada persona puede enlazar a su ficha de personaje
  (data.genealogia?.personas || []).forEach(persona => mapField(persona, 'personajePath'));

  return changed;
}

// Pasa a forma canónica todas las rutas guardadas en project.json. Se ejecuta
// al cargar el proyecto: así el fichero converge solo aunque le hayan entrado
// rutas con otra normalización o con "\" (git en otra máquina, edición desde
// fuera de la app). Es idempotente. Devuelve cuántas rutas ha tocado.
function canonicalizeProjectData() {
  const data = state.projectData;
  if (!data) return 0;

  let changed = 0;

  const canonField = (obj, key) => {
    if (!obj || typeof obj[key] !== 'string' || !obj[key]) return;
    const canon = canonPath(obj[key]);
    if (canon !== obj[key]) { obj[key] = canon; changed++; }
  };
  const canonList = (obj, key) => {
    if (!obj || !Array.isArray(obj[key])) return;
    obj[key] = obj[key].map(value => {
      if (typeof value !== 'string' || !value) return value;
      const canon = canonPath(value);
      if (canon !== value) changed++;
      return canon;
    });
  };
  // Si dos claves colapsan en la misma canónica son la misma entrada: gana la
  // primera, que es la que el resto del fichero ya venía referenciando.
  const canonKeys = (obj) => {
    if (!obj) return obj;
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      const canon = canonPath(key);
      if (canon !== key) changed++;
      if (!Object.prototype.hasOwnProperty.call(out, canon)) out[canon] = value;
    }
    return out;
  };

  const dirs = data.configuracion?.directorios;
  if (dirs) {
    ['capitulos', 'personajes', 'tramas', 'mundo', 'papelera'].forEach(tipo => canonField(dirs[tipo], 'ruta'));
    (dirs.otros || []).forEach(otro => canonField(otro, 'ruta'));
  }

  canonList(data.configuracion, 'ordenCarpetas');
  if (data.configuracion?.estadisticas?.capitulos) {
    data.configuracion.estadisticas.capitulos = canonKeys(data.configuracion.estadisticas.capitulos);
  }

  if (data.metadatos) {
    data.metadatos = canonKeys(data.metadatos);
    for (const meta of Object.values(data.metadatos)) {
      canonField(meta, 'escenaAnterior');
      canonField(meta, 'escenaSiguiente');
      canonList(meta, 'relacionesAnteriores');
      canonList(meta, 'relacionesPosteriores');
    }
  }

  if (data.metadatosTramas) {
    data.metadatosTramas = canonKeys(data.metadatosTramas);
    for (const meta of Object.values(data.metadatosTramas)) {
      canonField(meta, 'escenaInicio');
      canonField(meta, 'escenaFin');
    }
  }

  (data.genealogia?.personas || []).forEach(persona => canonField(persona, 'personajePath'));

  return changed;
}

// Elimina de project.json toda referencia a `deletedPath` y a lo que colgara
// de él. Devuelve cuántas referencias se han quitado.
function removeProjectPaths(deletedPath) {
  const data = state.projectData;
  if (!data || !deletedPath) return 0;

  let changed = 0;

  // Una ruta suelta guardada en un campo -> se vacía
  const clearField = (obj, key) => {
    if (!obj || typeof obj[key] !== 'string') return;
    if (pathMatches(obj[key], deletedPath)) { obj[key] = ''; changed++; }
  };

  // Un array de rutas -> se filtran las afectadas
  const filterList = (obj, key) => {
    if (!obj || !Array.isArray(obj[key])) return;
    const kept = obj[key].filter(value => !pathMatches(value, deletedPath));
    if (kept.length === obj[key].length) return;
    changed += obj[key].length - kept.length;
    obj[key] = kept;
  };

  // Un objeto {ruta: valor} -> se borran las claves afectadas
  const dropKeys = (obj) => {
    if (!obj) return obj;
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      if (pathMatches(key, deletedPath)) { changed++; continue; }
      out[key] = value;
    }
    return out;
  };

  const dirs = data.configuracion?.directorios;
  if (dirs) {
    ['capitulos', 'personajes', 'tramas', 'mundo', 'papelera'].forEach(tipo => {
      clearField(dirs[tipo], 'ruta');
    });
    if (Array.isArray(dirs.otros)) {
      const kept = dirs.otros.filter(otro => !pathMatches(otro?.ruta, deletedPath));
      changed += dirs.otros.length - kept.length;
      dirs.otros = kept;
    }
  }

  filterList(data.configuracion, 'ordenCarpetas');
  if (data.configuracion?.estadisticas?.capitulos) {
    data.configuracion.estadisticas.capitulos = dropKeys(data.configuracion.estadisticas.capitulos);
  }

  if (data.metadatos) {
    data.metadatos = dropKeys(data.metadatos);
    for (const meta of Object.values(data.metadatos)) {
      clearField(meta, 'escenaAnterior');
      clearField(meta, 'escenaSiguiente');
      filterList(meta, 'relacionesAnteriores');
      filterList(meta, 'relacionesPosteriores');
    }
  }

  if (data.metadatosTramas) {
    data.metadatosTramas = dropKeys(data.metadatosTramas);
    for (const meta of Object.values(data.metadatosTramas)) {
      clearField(meta, 'escenaInicio');
      clearField(meta, 'escenaFin');
    }
  }

  (data.genealogia?.personas || []).forEach(persona => clearField(persona, 'personajePath'));

  return changed;
}

// Los chips de personajes y tramas de los metadatos no guardan la ruta, sino el
// nombre limpio del fichero. `itemPath` decide a qué lista pertenecen mirando
// en qué directorio marcado vive; null si no es ficha de personaje ni de trama.
function chipFieldForPath(itemPath) {
  const dirs = state.projectData?.configuracion?.directorios;
  const parent = parentPathOf(itemPath || '');
  if (samePath(parent, dirs?.personajes?.ruta)) return 'personajes';
  if (samePath(parent, dirs?.tramas?.ruta)) return 'tramas';
  return null;
}

// Reescribe (o elimina, si `newName` es null) los chips que citan `oldName`.
function updateMetadataChips(campo, oldName, newName) {
  const data = state.projectData;
  if (!data || !campo || !oldName || oldName === newName) return 0;

  let changed = 0;
  const apply = (meta) => {
    if (!meta || !Array.isArray(meta[campo])) return;
    if (newName === null) {
      const kept = meta[campo].filter(nombre => nombre !== oldName);
      changed += meta[campo].length - kept.length;
      meta[campo] = kept;
      return;
    }
    meta[campo] = meta[campo].map(nombre => {
      if (nombre !== oldName) return nombre;
      changed++;
      return newName;
    });
  };

  Object.values(data.metadatos || {}).forEach(apply);

  // Los metadatos de trama también listan personajes por nombre
  if (campo === 'personajes') {
    Object.values(data.metadatosTramas || {}).forEach(apply);
  }

  return changed;
}

// Renombrar la ficha de un personaje o una trama deja sus chips huérfanos, así
// que se migran aparte de las rutas. Hay que llamarla ANTES de
// migrateProjectPaths: chipFieldForPath compara contra
// directorios.{personajes,tramas}.ruta, que aún no están migrados.
function migrateMetadataItemNames(oldPath, newPath) {
  const campo = chipFieldForPath(oldPath);
  if (!campo) return 0;
  return updateMetadataChips(campo, cleanItemName(oldPath), cleanItemName(newPath));
}

// Contrapartida al borrar: quita el chip en vez de reescribirlo.
function removeMetadataItemNames(deletedPath) {
  const campo = chipFieldForPath(deletedPath);
  if (!campo) return 0;
  return updateMetadataChips(campo, cleanItemName(deletedPath), null);
}

// Guarda project.json tras una migración/limpieza en memoria.
async function persistProjectReferences(changed) {
  if (changed === 0) return 0;

  const result = await window.electronAPI.saveProjectJson(state.projectJsonPath, state.projectData);
  if (!result.success) {
    showNotification('Error al actualizar las referencias del proyecto');
    return 0;
  }

  state.hasMarkedDirs = hasMarkedDirectories();
  return changed;
}

// Punto de entrada tras renombrar o mover. Devuelve el nº de referencias
// actualizadas (0 = no se ha tocado el fichero).
async function migrateProjectReferences(oldPath, newPath) {
  if (!state.projectData || !state.projectJsonPath) return 0;
  if (!oldPath || !newPath || oldPath === newPath) return 0;

  // El orden importa: los nombres se resuelven con los directorios sin migrar.
  const changed = migrateMetadataItemNames(oldPath, newPath) + migrateProjectPaths(oldPath, newPath);
  return persistProjectReferences(changed);
}

// Punto de entrada tras borrar.
async function removeProjectReferences(deletedPath) {
  if (!state.projectData || !state.projectJsonPath || !deletedPath) return 0;

  const changed = removeMetadataItemNames(deletedPath) + removeProjectPaths(deletedPath);
  return persistProjectReferences(changed);
}

// === ESTADO EN MEMORIA ===
//
// Las pestañas abiertas, el fichero en edición y el panel derecho también
// guardan rutas. Sin actualizarlas, renombrar un fichero abierto dejaba la
// pestaña apuntando al nombre viejo y el siguiente guardado recreaba el
// fichero con el nombre anterior.

function migrateOpenStatePaths(oldPath, newPath) {
  if (!oldPath || !newPath || oldPath === newPath) return;

  if (typeof remapEditorialCachePaths === 'function') {
    remapEditorialCachePaths(oldPath, newPath);
  }

  let tabsChanged = false;
  (state.openTabs || []).forEach(tab => {
    const mapped = remapPath(tab.path, oldPath, newPath);
    if (mapped === null) return;
    tab.path = mapped;
    tab.name = nameFromPath(mapped);
    tabsChanged = true;
  });

  state.currentFile         = remapPath(state.currentFile, oldPath, newPath)         ?? state.currentFile;
  state.splitFile           = remapPath(state.splitFile, oldPath, newPath)           ?? state.splitFile;
  state.splitMetadataFolder = remapPath(state.splitMetadataFolder, oldPath, newPath) ?? state.splitMetadataFolder;

  const item = state.splitMetadataItem;
  if (item?.path) {
    const mapped = remapPath(item.path, oldPath, newPath);
    if (mapped !== null) {
      item.path = mapped;
      item.name = nameFromPath(mapped);
    }
  }

  if (tabsChanged) {
    renderTabs();
    updateFileIndicator();
    if (state.currentFile) window.electronAPI.saveLastFile(state.currentFile);
  }
}

// Contrapartida al borrar: cierra las pestañas afectadas y suelta el split.
function dropOpenStatePaths(deletedPath) {
  if (!deletedPath) return;

  if (typeof removeEditorialCachePaths === 'function') {
    removeEditorialCachePaths(deletedPath);
  }

  const tabs = state.openTabs || [];
  const activePath = getActiveTab()?.path || null;
  const kept = tabs.filter(tab => !pathMatches(tab.path, deletedPath));

  if (kept.length !== tabs.length) {
    state.openTabs = kept;
    // Mantener activa la misma pestaña si ha sobrevivido
    const stillOpen = activePath ? kept.findIndex(tab => samePath(tab.path, activePath)) : -1;
    state.activeTabIndex = stillOpen !== -1 ? stillOpen : (kept.length ? 0 : -1);
    state.hasUnsavedChanges = false;
    renderTabs();
    loadTabContent(state.activeTabIndex);
  }

  if (pathMatches(state.currentFile, deletedPath)) state.currentFile = null;

  if (pathMatches(state.splitFile, deletedPath) ||
      pathMatches(state.splitMetadataFolder, deletedPath)) {
    closeSplit();
    state.splitMetadataFolder = null;
    state.splitMetadataItem = null;
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
  return samePath(parentPathOf(folderPath), capitulosRuta);
}

async function openChapterStats(folderPath) {
  const cached = getByPath(state.projectData?.configuracion?.estadisticas?.capitulos, folderPath);
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
    setByPath(state.projectData.configuracion.estadisticas.capitulos, folderPath, stats);
    await window.electronAPI.saveProjectJson(state.projectJsonPath, state.projectData);
  }

  showChapterStatsModal(folderPath, stats);
}

function showChapterStatsModal(folderPath, stats) {
  const name = nameFromPath(folderPath);
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
  const cached = getByPath(state.projectData?.configuracion?.estadisticas?.capitulos, folderPath)?.frecuenciaPalabras;
  if (cached && cached.length > 0) {
    showWordFreqModal(folderPath, cached);
  } else {
    await calculateAndShowWordFreq(folderPath);
  }
}

async function calculateAndShowWordFreq(folderPath) {
  document.getElementById('word-freq-summary').textContent = 'Calculando…';
  openModal('modal-word-freq');
  document.getElementById('word-freq-chapter-name').textContent = nameFromPath(folderPath);

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
    const capitulos = state.projectData.configuracion.estadisticas.capitulos;
    if (!getByPath(capitulos, folderPath)) setByPath(capitulos, folderPath, {});
    Object.assign(getByPath(capitulos, folderPath), {
      frecuenciaPalabras: result.words,
      frecuenciaCalculado: new Date().toISOString().split('T')[0],
      frecuenciaMinLetras: minLetters
    });
    await window.electronAPI.saveProjectJson(state.projectJsonPath, state.projectData);
  }

  showWordFreqModal(folderPath, result.words);
}

function showWordFreqModal(folderPath, words) {
  const name = nameFromPath(folderPath);
  document.getElementById('word-freq-chapter-name').textContent = name;
  _wordFreqData = words;

  const fecha = getByPath(state.projectData?.configuracion?.estadisticas?.capitulos, folderPath)?.frecuenciaCalculado;
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
    openWordFreqModal,
    canonPath,
    samePath,
    sameName,
    getByPath,
    setByPath,
    canonicalizeProjectData,
    parentPathOf,
    nameFromPath,
    cleanItemName,
    pathMatches,
    remapPath,
    migrateProjectPaths,
    migrateMetadataItemNames,
    migrateProjectReferences,
    removeProjectPaths,
    removeMetadataItemNames,
    removeProjectReferences,
    migrateOpenStatePaths,
    dropOpenStatePaths
  };
}
