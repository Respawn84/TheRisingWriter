// === PANEL DE METADATOS DE CAPÍTULO ===

// Contador de generación: cualquier carga de fichero en el split lo incrementa,
// cancelando renders de metadatos que lleguen tarde (race condition).
function cancelPendingMetadataRender() {
  state.metaLoadGen = (state.metaLoadGen || 0) + 1;
}

async function openSceneMetadataPanel(file) {
  cancelPendingMetadataRender();
  const gen = state.metaLoadGen;

  state.splitMetadataFolder = file.path;
  state.splitFile = null;

  if (!state.splitActive) {
    state.splitActive = true;
    showSplit();
  }

  document.getElementById('split-file-name').textContent = `📋 ${file.name}`;

  const editor = document.getElementById('editor-reference');
  editor.innerHTML = '<div style="padding:20px;color:var(--text-secondary)">Cargando metadatos...</div>';

  const [personajesItems, tramasItems, allScenes] = await Promise.all([
    loadPersonajesItems(),
    loadTramasItems(),
    loadAllScenes()
  ]);

  if (state.metaLoadGen !== gen) return; // otra operación tomó el split — cancelar

  const existing = getChapterMetadata(file.path);

  editor.innerHTML = renderMetadataPanel(existing, personajesItems, tramasItems, allScenes, null, false);

  setupMetadataListeners(file.path);
}

async function openChapterMetadataPanel(folder) {
  cancelPendingMetadataRender();
  const gen = state.metaLoadGen;

  state.splitMetadataFolder = folder.path;
  state.splitFile = null;

  if (!state.splitActive) {
    state.splitActive = true;
    showSplit();
  }

  document.getElementById('split-file-name').textContent = `📋 ${folder.name}`;

  const editor = document.getElementById('editor-reference');
  editor.innerHTML = '<div style="padding:20px;color:var(--text-secondary)">Cargando metadatos...</div>';

  const [personajesItems, tramasItems, allScenes, wordStats] = await Promise.all([
    loadPersonajesItems(),
    loadTramasItems(),
    loadAllScenes(),
    computeWordStats(folder.path)
  ]);

  if (state.metaLoadGen !== gen) return; // otra operación tomó el split — cancelar

  const existing = getChapterMetadata(folder.path);

  editor.innerHTML = renderMetadataPanel(existing, personajesItems, tramasItems, allScenes, wordStats);

  setupMetadataListeners(folder.path);
}

async function loadPersonajesItems() {
  const ruta = state.projectData?.configuracion?.directorios?.personajes?.ruta;
  if (!ruta) return [];
  try {
    const items = await window.electronAPI.readDirectory(ruta);
    return items.filter(i => i.isFile).map(i => i.name.replace(/\.[^.]+$/, '').replace(/^\d+-/, ''));
  } catch { return []; }
}

async function loadTramasItems() {
  const ruta = state.projectData?.configuracion?.directorios?.tramas?.ruta;
  if (!ruta) return [];
  try {
    const items = await window.electronAPI.readDirectory(ruta);
    return items.filter(i => i.isFile).map(i => i.name.replace(/\.[^.]+$/, '').replace(/^\d+-/, ''));
  } catch { return []; }
}

async function loadAllScenes() {
  const capitulosRuta = state.projectData?.configuracion?.directorios?.capitulos?.ruta;
  if (!capitulosRuta) return [];

  const scenes = [];
  try {
    const chapters = await window.electronAPI.readDirectory(capitulosRuta);
    const chapterDirs = chapters
      .filter(i => i.isDirectory)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    for (const ch of chapterDirs) {
      const files = await window.electronAPI.readDirectory(ch.path);
      const sceneFiles = files
        .filter(i => i.isFile)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      for (const sf of sceneFiles) {
        scenes.push({ label: `${ch.name} / ${sf.name}`, path: sf.path });
      }
    }
  } catch {}

  return scenes;
}

async function computeWordStats(folderPath) {
  try {
    const files = await window.electronAPI.readDirectory(folderPath);
    const txtFiles = files.filter(i => i.isFile && i.name.endsWith('.txt'));

    let totalWords = 0;
    let totalChars = 0;
    const sceneStats = [];

    for (const file of txtFiles) {
      const result = await window.electronAPI.readFile(file.path);
      if (result.success) {
        const words = result.content.trim() ? result.content.trim().split(/\s+/).length : 0;
        const chars = result.content.length;
        totalWords += words;
        totalChars += chars;
        sceneStats.push({ name: file.name, words, chars });
      }
    }

    return { totalWords, totalChars, sceneStats };
  } catch {
    return { totalWords: 0, totalChars: 0, sceneStats: [] };
  }
}

function getChapterMetadata(folderPath) {
  if (!state.projectData) return { personajes: [], tramas: [], escenaAnterior: '', escenaSiguiente: '' };
  if (!state.projectData.metadatos) state.projectData.metadatos = {};
  return state.projectData.metadatos[folderPath] || { personajes: [], tramas: [], escenaAnterior: '', escenaSiguiente: '' };
}

function escapeAttr(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function renderMetadataPanel(existing, personajesItems, tramasItems, allScenes, wordStats, showStats = true) {
  function sceneOptions(selected) {
    return `<option value="">— Ninguna —</option>` +
      allScenes.map(s =>
        `<option value="${escapeAttr(s.path)}"${s.path === selected ? ' selected' : ''}>${escapeHtml(s.label)}</option>`
      ).join('');
  }

  function comboOptions(items, placeholder) {
    return `<option value="">${escapeHtml(placeholder)}</option>` +
      items.map(p => `<option value="${escapeAttr(p)}">${escapeHtml(p)}</option>`).join('');
  }

  function tagsHtml(items) {
    return (items || []).map(item =>
      `<span class="meta-tag" data-value="${escapeAttr(item)}">${escapeHtml(item)}<button class="meta-tag-remove" data-value="${escapeAttr(item)}" title="Eliminar">×</button></span>`
    ).join('');
  }

  const statsRows = (showStats && wordStats)
    ? wordStats.sceneStats.map(s =>
        `<div class="meta-stat-row">
          <span class="meta-stat-name">${escapeHtml(s.name)}</span>
          <span class="meta-stat-words">${s.words.toLocaleString()} pal.</span>
          <span class="meta-stat-chars">${s.chars.toLocaleString()} car.</span>
        </div>`
      ).join('')
    : '';

  return `
<div class="meta-panel">

  <div class="meta-section">
    <div class="meta-section-title">👤 Personajes que participan</div>
    <div class="meta-combo-row">
      <select id="meta-personajes-combo" class="meta-select">
        ${comboOptions(personajesItems, personajesItems.length ? 'Selecciona personaje...' : 'Sin carpeta Personajes')}
      </select>
      <button id="meta-add-personaje" class="meta-btn-add" ${!personajesItems.length ? 'disabled' : ''}>+ Añadir</button>
    </div>
    <div id="meta-personajes-list" class="meta-tag-list">
      ${tagsHtml(existing.personajes)}
    </div>
  </div>

  <div class="meta-section">
    <div class="meta-section-title">🎭 Tramas que se tocan</div>
    <div class="meta-combo-row">
      <select id="meta-tramas-combo" class="meta-select">
        ${comboOptions(tramasItems, tramasItems.length ? 'Selecciona trama...' : 'Sin carpeta Tramas')}
      </select>
      <button id="meta-add-trama" class="meta-btn-add" ${!tramasItems.length ? 'disabled' : ''}>+ Añadir</button>
    </div>
    <div id="meta-tramas-list" class="meta-tag-list">
      ${tagsHtml(existing.tramas)}
    </div>
  </div>

  <div class="meta-section">
    <div class="meta-section-title">↩ Escena anterior en la trama</div>
    <select id="meta-escena-anterior" class="meta-select meta-select-full">
      ${sceneOptions(existing.escenaAnterior || '')}
    </select>
  </div>

  <div class="meta-section">
    <div class="meta-section-title">↪ Escena siguiente en la trama</div>
    <select id="meta-escena-siguiente" class="meta-select meta-select-full">
      ${sceneOptions(existing.escenaSiguiente || '')}
    </select>
  </div>

  ${showStats && wordStats ? `
  <div class="meta-section">
    <div class="meta-section-title">📊 Estadísticas de palabras</div>
    <div class="meta-stats-total">
      <span class="meta-stats-num">${wordStats.totalWords.toLocaleString()}</span> palabras
      <span class="meta-stats-sep">·</span>
      <span class="meta-stats-chars">${wordStats.totalChars.toLocaleString()} caracteres</span>
    </div>
    ${statsRows
      ? `<div class="meta-stats-table">${statsRows}</div>`
      : '<div class="meta-empty-hint">No hay escenas (.txt) en este capítulo</div>'
    }
  </div>` : ''}

  <div class="meta-actions">
    <button id="meta-btn-save" class="btn-primary">💾 Guardar metadatos</button>
  </div>

</div>`;
}

function isAlreadyInList(listEl, value) {
  return Array.from(listEl.querySelectorAll('.meta-tag')).some(el => el.dataset.value === value);
}

function createMetaTag(value) {
  const span = document.createElement('span');
  span.className = 'meta-tag';
  span.dataset.value = value;
  span.innerHTML = `${escapeHtml(value)}<button class="meta-tag-remove" title="Eliminar">×</button>`;
  span.querySelector('.meta-tag-remove').addEventListener('click', (e) => {
    e.stopPropagation();
    span.remove();
  });
  return span;
}

function setupMetadataListeners(folderPath) {
  document.getElementById('meta-add-personaje')?.addEventListener('click', () => {
    const combo = document.getElementById('meta-personajes-combo');
    const value = combo.value;
    if (!value) return;
    const list = document.getElementById('meta-personajes-list');
    if (isAlreadyInList(list, value)) return;
    list.appendChild(createMetaTag(value));
    combo.value = '';
  });

  document.getElementById('meta-add-trama')?.addEventListener('click', () => {
    const combo = document.getElementById('meta-tramas-combo');
    const value = combo.value;
    if (!value) return;
    const list = document.getElementById('meta-tramas-list');
    if (isAlreadyInList(list, value)) return;
    list.appendChild(createMetaTag(value));
    combo.value = '';
  });

  // Delegación de eventos para los botones × en tags renderizados desde HTML
  document.getElementById('meta-personajes-list')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('meta-tag-remove')) {
      e.target.closest('.meta-tag').remove();
    }
  });
  document.getElementById('meta-tramas-list')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('meta-tag-remove')) {
      e.target.closest('.meta-tag').remove();
    }
  });

  document.getElementById('meta-btn-save')?.addEventListener('click', () => {
    saveChapterMetadata(folderPath);
  });
}

async function saveChapterMetadata(folderPath) {
  if (!state.projectData || !state.projectJsonPath) return;

  if (!state.projectData.metadatos) state.projectData.metadatos = {};

  const personajes = Array.from(document.querySelectorAll('#meta-personajes-list .meta-tag'))
    .map(el => el.dataset.value);
  const tramas = Array.from(document.querySelectorAll('#meta-tramas-list .meta-tag'))
    .map(el => el.dataset.value);
  const escenaAnterior = document.getElementById('meta-escena-anterior')?.value || '';
  const escenaSiguiente = document.getElementById('meta-escena-siguiente')?.value || '';

  state.projectData.metadatos[folderPath] = { personajes, tramas, escenaAnterior, escenaSiguiente };

  const result = await window.electronAPI.saveProjectJson(state.projectJsonPath, state.projectData);
  if (result.success) {
    showNotification('Metadatos guardados');
  } else {
    showNotification('Error al guardar metadatos');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { openChapterMetadataPanel, openSceneMetadataPanel };
}
